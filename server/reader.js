// Reads text out of any syllabus file: PDF, Word, PowerPoint, Excel, OpenDocument, RTF, HTML,
// text/CSV/JSON and images (JPG, PNG, WebP, GIF, BMP, TIFF) using OCR.
const path = require('path');
const JSZip = require('jszip');
const config = require('./config');

const IMAGE_EXT = ['.jpg', '.jpeg', '.jpe', '.jfif', '.png', '.webp', '.gif', '.bmp', '.tif', '.tiff', '.avif'];
const TEXT_EXT = ['.txt', '.md', '.markdown', '.csv', '.tsv', '.log', '.text', ''];

const decodeEntities = (s) =>
  String(s)
    .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"').replace(/&apos;|&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));

function fail(msg) {
  return Object.assign(new Error(msg), { status: 400 });
}

// ---- Office Open XML / OpenDocument (zip containers) ----
async function readZipXml(buffer, matcher, tagRe, sep) {
  const zip = await JSZip.loadAsync(buffer);
  const names = Object.keys(zip.files).filter(matcher).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const out = [];
  for (const n of names) {
    const xml = await zip.file(n).async('string');
    out.push(tagRe(xml));
  }
  return out.join(sep);
}

const pptxText = (xml) =>
  xml.replace(/<\/a:p>/g, '\n').replace(/<a:br\s*\/>/g, '\n').replace(/<[^>]+>/g, '');

async function readPptx(buffer) {
  return decodeEntities(await readZipXml(buffer, (n) => /^ppt\/slides\/slide\d+\.xml$/.test(n), pptxText, '\n\n'));
}

async function readXlsx(buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const sstFile = zip.file('xl/sharedStrings.xml');
  const shared = [];
  if (sstFile) {
    const xml = await sstFile.async('string');
    for (const m of xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)) {
      shared.push(decodeEntities([...m[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((x) => x[1]).join('')));
    }
  }
  const sheets = Object.keys(zip.files).filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const lines = [];
  for (const n of sheets) {
    const xml = await zip.file(n).async('string');
    for (const row of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
      const cells = [];
      for (const c of row[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const attrs = c[1];
        const inner = c[2] || '';
        const v = /<v>([\s\S]*?)<\/v>/.exec(inner);
        if (/t="s"/.test(attrs) && v) cells.push(shared[Number(v[1])] || '');
        else if (/t="inlineStr"/.test(attrs)) cells.push(decodeEntities([...inner.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((x) => x[1]).join('')));
        else if (v) cells.push(decodeEntities(v[1]));
      }
      const line = cells.filter(Boolean).join(' – ');
      if (line.trim()) lines.push(line);
    }
  }
  return lines.join('\n');
}

async function readOpenDocument(buffer) {
  const text = await readZipXml(buffer, (n) => n === 'content.xml', (xml) =>
    xml.replace(/<\/text:(p|h)>/g, '\n').replace(/<text:line-break\s*\/>/g, '\n').replace(/<text:tab\s*\/>/g, ' ').replace(/<[^>]+>/g, ''), '\n');
  return decodeEntities(text);
}

function readRtf(buffer) {
  return buffer.toString('latin1')
    .replace(/\\'([0-9a-f]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\par[d]?/g, '\n').replace(/\\tab/g, ' ')
    .replace(/\{\\\*[^{}]*\}/g, '')
    .replace(/\\[a-z]+-?\d* ?/gi, '').replace(/[{}]/g, '');
}

function readHtml(buffer) {
  return decodeEntities(
    buffer.toString('utf8')
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
      .replace(/<\/(p|div|li|tr|h[1-6]|br)>|<br\s*\/?>/gi, '\n')
      .replace(/<\/t[dh]>/gi, ' ')
      .replace(/<[^>]+>/g, '')
  );
}

function readJson(buffer) {
  try {
    const out = [];
    (function walk(v) {
      if (typeof v === 'string') out.push(v);
      else if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === 'object') Object.values(v).forEach(walk);
    })(JSON.parse(buffer.toString('utf8')));
    return out.join('\n');
  } catch {
    return buffer.toString('utf8');
  }
}

// ---- Word (.docx): own reader so tables come out row by row and equations are kept ----
function readDocx(buffer) {
  return JSZip.loadAsync(buffer).then(async (zip) => {
    const f = zip.file('word/document.xml');
    if (!f) return '';
    const xml = await f.async('string');
    const tok = /<(\/?)(w:tbl|w:tr|w:tc|w:p|m:num|m:den|m:sup|m:sub|m:rad|m:deg)\b[^>]*?(\/?)>|<w:t\b[^>]*>([^<]*)<\/w:t>|<m:t\b[^>]*>([^<]*)<\/m:t>|<w:tab\s*\/>|<w:br\s*\/>|<m:chr\b[^>]*m:val="([^"]*)"[^>]*\/>/g;
    const lines = [];
    // stack of containers: each collects paragraphs (cells) or cells (rows)
    const stack = [{ type: 'body', items: [] }];
    let para = '';
    let m;
    while ((m = tok.exec(xml))) {
      const [all, close, tag, selfClose, wt, mt, chr] = m;
      if (wt !== undefined) { para += decodeEntities(wt); continue; }
      if (mt !== undefined) { para += decodeEntities(mt); continue; }
      if (chr !== undefined) { para += chr; continue; }
      if (all.startsWith('<w:tab')) { para += ' '; continue; }
      if (all.startsWith('<w:br')) { para += '\n'; continue; }
      if (selfClose) continue;
      const top = stack[stack.length - 1];
      if (!close) {
        if (tag === 'w:tbl') stack.push({ type: 'tbl', items: [] });
        else if (tag === 'w:tr') stack.push({ type: 'tr', items: [] });
        else if (tag === 'w:tc') stack.push({ type: 'tc', items: [] });
        else if (tag === 'm:num') para += '(';
        else if (tag === 'm:den') para += '/(';
        else if (tag === 'm:sup') para += '^(';
        else if (tag === 'm:sub') para += '_(';
        else if (tag === 'm:rad') para += '√(';
        else if (tag === 'm:deg') para += '[';
      } else if (tag === 'w:p') {
        const t = para.replace(/[ \t]+/g, ' ').trim();
        para = '';
        if (t) top.items.push(t);
      } else if (['m:num', 'm:den', 'm:sup', 'm:sub', 'm:rad'].includes(tag)) para += ')';
      else if (tag === 'm:deg') para += ']';
      else if (tag === 'w:tc') {
        const cell = stack.pop();
        const parent = stack[stack.length - 1];
        parent.items.push(cell.items.map((x) => (typeof x === 'string' ? x : x.row.replace(/\t/g, ' | '))).join(' '));
      } else if (tag === 'w:tr') {
        const row = stack.pop();
        const parent = stack[stack.length - 1];
        const line = row.items.map((c) => c.trim()).join('\t').trim();
        if (line) parent.items.push({ row: line });
      } else if (tag === 'w:tbl') {
        const tbl = stack.pop();
        const parent = stack[stack.length - 1];
        for (const it of tbl.items) parent.items.push(it);
      }
    }
    const walk = (items) => items.forEach((it) => lines.push(typeof it === 'string' ? it : it.row));
    walk(stack[0].items);
    return lines.join('\n');
  });
}

async function readLegacyDoc(buffer) {
  const WordExtractor = require('word-extractor');
  const doc = await new WordExtractor().extract(buffer);
  return [doc.getBody(), doc.getFootnotes && doc.getFootnotes()].filter(Boolean).join('\n');
}

// ---- PDF ----
async function readPdf(buffer) {
  const pdfParse = require('pdf-parse/lib/pdf-parse.js');
  let text = '';
  try {
    text = (await pdfParse(buffer)).text || '';
  } catch (e) {
    if (!config.anthropicKey) throw fail('This PDF could not be opened. It may be damaged or password protected.');
  }
  if (text.replace(/\s/g, '').length >= 40) return text;
  const ai = await readWithClaude(buffer, 'application/pdf');
  if (ai) return ai;
  throw fail('This PDF has no selectable text (it looks like a scan). Upload the pages as JPG/PNG images instead, or paste the text.');
}

// ---- images (OCR) ----
let ocrWorker;
let ocrBusy = Promise.resolve();

async function getWorker() {
  if (ocrWorker) return ocrWorker;
  const { createWorker } = require('tesseract.js');
  let langPath;
  try {
    langPath = path.dirname(require.resolve('@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz'));
  } catch { /* falls back to the CDN */ }
  ocrWorker = await createWorker('eng', 1, {
    ...(langPath ? { langPath, gzip: true } : {}),
    cachePath: require('os').tmpdir(),
    logger: () => {},
  });
  return ocrWorker;
}

async function prepareImage(buffer) {
  const sharp = require('sharp');
  const img = sharp(buffer, { failOn: 'none' }).rotate(); // honour phone camera orientation
  const meta = await img.metadata();
  let w = meta.width || 0;
  const target = w && w < 1500 ? 1800 : w > 3200 ? 3200 : w; // OCR reads small text better when enlarged
  return img.resize({ width: target || undefined, withoutEnlargement: false }).grayscale().normalize().sharpen().png().toBuffer();
}

async function readImage(buffer, ext) {
  let png;
  try {
    png = await prepareImage(buffer);
  } catch {
    throw fail(`This picture (${ext.replace('.', '').toUpperCase()}) could not be opened. Try saving it as JPG or PNG.`);
  }
  const run = async () => {
    const worker = await getWorker();
    const { data } = await worker.recognize(png);
    return data.text || '';
  };
  // one OCR job at a time keeps memory use predictable
  const job = ocrBusy.then(run, run);
  ocrBusy = job.catch(() => {});
  let text = '';
  try {
    text = await job;
  } catch (e) {
    ocrWorker = null;
    if (!config.anthropicKey) throw fail('Picture reading is not available on this server right now. Paste the syllabus text instead, or upload a PDF/Word file.');
  }
  if (text.replace(/\s/g, '').length < 40 && config.anthropicKey) {
    const ai = await readWithClaude(buffer, ext.startsWith('.png') ? 'image/png' : ext === '.webp' ? 'image/webp' : ext === '.gif' ? 'image/gif' : 'image/jpeg');
    if (ai) text = ai;
  }
  return fixUnitHeadings(text);
}

// OCR often reads the roman numeral in "UNIT I" as "|", "l" or "!".
function fixUnitHeadings(text) {
  return String(text).replace(/^(\s*(?:UNIT|MODULE|CHAPTER)\s*[-–—:.]?\s*)([IVXLlil|!1]{1,5})(?=\s|$|[:.\-–—])/gim, (m, head, tok) => {
    if (/^\d+$/.test(tok)) return m;
    return head + tok.replace(/[l|!i1]/g, 'I').toUpperCase();
  });
}

// Optional: use Claude to read scans / hard pictures when an API key is set.
async function readWithClaude(buffer, mediaType) {
  if (!config.anthropicKey) return '';
  try {
    const Anthropic = require('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey: config.anthropicKey, timeout: 90000 });
    const block = mediaType === 'application/pdf'
      ? { type: 'document', source: { type: 'base64', media_type: mediaType, data: buffer.toString('base64') } }
      : { type: 'image', source: { type: 'base64', media_type: mediaType, data: buffer.toString('base64') } };
    const res = await client.messages.create({
      model: config.anthropicModel || 'claude-sonnet-5-5',
      max_tokens: 8000,
      messages: [{ role: 'user', content: [block, { type: 'text', text: 'Transcribe all the text in this syllabus exactly, keeping UNIT headings on their own lines. Output only the text.' }] }],
    });
    return (res.content || []).map((c) => c.text || '').join('\n');
  } catch {
    return '';
  }
}

async function readFile(file) {
  const name = file.originalname || '';
  const ext = path.extname(name).toLowerCase();
  const mime = file.mimetype || '';
  const buf = file.buffer;
  if (ext === '.pdf' || mime === 'application/pdf') return readPdf(buf);
  if (ext === '.docx' || ext === '.docm' || ext === '.dotx') {
    let t = '';
    try { t = await readDocx(buf); } catch { /* fall back below */ }
    if (t.replace(/\s/g, '').length < 20) t = (await require('mammoth').extractRawText({ buffer: buf })).value || '';
    return t;
  }
  if (ext === '.doc' || ext === '.dot') {
    // some phones save a .docx under the name .doc: check the zip signature first
    if (buf[0] === 0x50 && buf[1] === 0x4b) return readFile({ ...file, originalname: `${name}x` });
    try { return await readLegacyDoc(buf); } catch { throw fail('This old Word (.doc) file could not be read. Open it in Word and “Save as” .docx, then upload again.'); }
  }
  if (ext === '.pptx' || ext === '.ppsx') return readPptx(buf);
  if (ext === '.xlsx' || ext === '.xlsm') return readXlsx(buf);
  if (['.odt', '.odp', '.ods'].includes(ext)) return readOpenDocument(buf);
  if (ext === '.rtf') return readRtf(buf);
  if (['.html', '.htm', '.xhtml', '.xml'].includes(ext) || mime === 'text/html') return readHtml(buf);
  if (ext === '.json') return readJson(buf);
  if (IMAGE_EXT.includes(ext) || mime.startsWith('image/')) return readImage(buf, ext || '.png');
  if (TEXT_EXT.includes(ext) || mime.startsWith('text/')) return buf.toString('utf8');
  if (['.ppt', '.xls'].includes(ext)) throw fail(`Old Office files (${ext}) cannot be read. Open it and “Save as” ${ext === '.ppt' ? '.pptx' : '.xlsx'}, then upload again.`);
  if (['.heic', '.heif'].includes(ext)) throw fail('HEIC photos are not supported. Take or save the picture as JPG/PNG (on iPhone: Settings → Camera → Formats → Most Compatible).');
  throw fail(`“${name}” is not a supported file type. Upload a PDF, Word, PowerPoint, Excel, text file or a picture (JPG/PNG).`);
}

module.exports = { readFile };
