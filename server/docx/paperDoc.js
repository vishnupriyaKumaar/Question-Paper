// Question paper (.docx) in the college's own format. The page header (shield, college
// name, TUV SUD badge, DATE and REG.NO boxes, approval lines) is the exact Word header taken
// from the department's sample paper (server/assets/header/) and is repeated on every page.
const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');
const {
  Document, Packer, Paragraph, Header, TabStopType, TableRow, VerticalAlign,
} = require('docx');
const config = require('../config');
const C = require('./common');
const { run, para, cell, table, NO_BORDERS, AlignmentType } = C;

const PAGE_W = 11906;
const MARGIN = { top: 1161, bottom: 630, left: 720, right: 720, header: 270, footer: 195 };
const CW = PAGE_W - MARGIN.left - MARGIN.right; // 10466
const COLS = [800, CW - 800 - 900 - 900 - 800, 900, 900, 800];

// ---------------------------------------------------------------- body
function titleBlock(m) {
  const line = (t, o = {}) => para(t, { bold: true, size: 24, align: AlignmentType.CENTER, ...o });
  const reg = m.regulation ? ` (Regulations ${m.regulation})` : '';
  return [
    line(m.title, { before: 160 }),
    line(`ACADEMIC YEAR ${m.academicYear}`),
    line(m.yearSem),
    line(m.department),
    line(`${m.subjectCode} - ${m.subjectName}${reg}`),
    line(`SET – ${m.set}`),
    new Paragraph({
      spacing: { before: 120, after: 60 },
      tabStops: [{ type: TabStopType.RIGHT, position: CW }],
      children: [run(`Time: ${m.time}`, { bold: true, size: 24 }), run('\t'), run(`Maximum Marks: ${m.maxMarks}`, { bold: true, size: 24 })],
    }),
  ];
}

function questionTable(paper) {
  const rows = [];
  const head = (t, w) => cell([para(t, { bold: true, align: AlignmentType.CENTER })], w);
  rows.push(
    new TableRow({
      tableHeader: true,
      children: [head('Q. No.', COLS[0]), head('Answer ALL Questions', COLS[1]), head('CO', COLS[2]), head('PO', COLS[3]), head('BL', COLS[4])],
    })
  );

  for (const part of paper.parts) {
    rows.push(
      new TableRow({
        cantSplit: true,
        children: [cell([para(part.title, { bold: true, align: AlignmentType.CENTER, keepNext: true })], CW, { span: 5 })],
      })
    );
    for (const q of part.questions) {
      if (q.sub === 'b') {
        rows.push(
          new TableRow({
            cantSplit: true,
            children: [cell([para('OR', { align: AlignmentType.CENTER, keepNext: true })], CW, { span: 5, padV: 20 })],
          })
        );
      }
      const textParas = String(q.text || '')
        .split('\n')
        .map((t) => para(t, { size: 21 }));
      rows.push(
        new TableRow({
          cantSplit: true,
          children: [
            cell([para(q.sub ? `${q.no} ${q.sub}` : String(q.no), { bold: true, align: AlignmentType.CENTER })], COLS[0]),
            cell(textParas, COLS[1], { valign: VerticalAlign.CENTER }),
            cell([para(q.co, { align: AlignmentType.CENTER })], COLS[2]),
            cell([para(q.po, { align: AlignmentType.CENTER })], COLS[3]),
            cell([para(String(q.bl), { align: AlignmentType.CENTER })], COLS[4]),
          ],
        })
      );
    }
  }
  return table(rows, COLS);
}

function outcomesBlock(paper) {
  const out = [
    para('COURSE OUTCOMES:', { bold: true, size: 21, underline: true, before: 200, keepNext: true }),
    para('Upon successful completion of this course, students will be able to:', { bold: true, size: 20, keepNext: true }),
  ];
  for (const o of paper.outcomes || []) {
    out.push(
      new Paragraph({
        spacing: { after: 20 },
        indent: { left: 1300, hanging: 760 },
        tabStops: [{ type: TabStopType.LEFT, position: 1300 }],
        children: [run(`${o.co}:`, { bold: true, size: 19 }), run('\t'), run(o.text, { size: 19 })],
      })
    );
  }
  return out;
}

function signatures() {
  const w = Math.floor(CW / 3);
  const c = (t, align) => cell([para('', { before: 420 }), para(t, { bold: true, size: 21, align })], w, { borders: NO_BORDERS, valign: VerticalAlign.BOTTOM });
  return table(
    [new TableRow({ children: [c('COURSE COORDINATOR', AlignmentType.LEFT), c('FACULTY IN-CHARGE', AlignmentType.CENTER), c('HOD', AlignmentType.RIGHT)] })],
    [w, w, CW - 2 * w]
  );
}

// Placeholder header (replaced by the real one below). Only the text fallback shows if the
// template files are ever missing.
function placeholderHeader() {
  return new Header({
    children: [
      para(config.college.name.toUpperCase().replace('TIRUTTANI', 'Tiruttani'), { bold: true, size: 26, align: AlignmentType.CENTER }),
      para(`${config.college.status} ${config.college.approval}`, { size: 17, align: AlignmentType.CENTER }),
    ],
  });
}

function sectionFor(paper) {
  return {
    properties: { page: { size: { width: PAGE_W, height: 16838 }, margin: MARGIN } },
    headers: { default: placeholderHeader() },
    children: [...titleBlock(paper.meta), questionTable(paper), ...outcomesBlock(paper), signatures()],
  };
}

// ---------------------------------------------------------------- real Word header
const xmlEscape = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

async function injectHeader(buf, papers) {
  const dir = path.join(__dirname, '..', 'assets', 'header');
  let tpl;
  let img1;
  let img2;
  let rels;
  try {
    tpl = fs.readFileSync(path.join(dir, 'header.xml'), 'utf8');
    rels = fs.readFileSync(path.join(dir, 'header.xml.rels'), 'utf8');
    img1 = fs.readFileSync(path.join(dir, 'hdr_image1.png'));
    img2 = fs.readFileSync(path.join(dir, 'hdr_image2.jpeg'));
  } catch {
    return buf; // template missing: keep the text header
  }

  const zip = await JSZip.loadAsync(buf);
  const docXml = await zip.file('word/document.xml').async('string');
  const docRels = await zip.file('word/_rels/document.xml.rels').async('string');

  // section order -> header part name
  const relTarget = {};
  for (const m of docRels.matchAll(/<Relationship\b[^>]*>/g)) {
    const id = /\bId="([^"]+)"/.exec(m[0]);
    const target = /\bTarget="([^"]+)"/.exec(m[0]);
    if (id && target) relTarget[id[1]] = target[1];
  }
  const sectionHeaders = [];
  for (const m of docXml.matchAll(/<w:headerReference\b[^>]*>/g)) {
    if (!/w:type="default"/.test(m[0])) continue;
    const id = /r:id="([^"]+)"/.exec(m[0]);
    if (id && relTarget[id[1]]) sectionHeaders.push(relTarget[id[1]]);
  }
  if (!sectionHeaders.length) return buf;

  const fixedRels = rels.replace(/media\/image1\.png/g, 'media/hdr_image1.png').replace(/media\/image2\.jpeg/g, 'media/hdr_image2.jpeg');
  const done = new Set();
  sectionHeaders.forEach((target, i) => {
    if (done.has(target)) return;
    done.add(target);
    const date = papers[i] && papers[i].meta.date ? ` ${xmlEscape(papers[i].meta.date)}` : '';
    const xml = tpl.replace('<w:t>DATE:</w:t>', `<w:t xml:space="preserve">DATE:${date}</w:t>`);
    zip.file(`word/${target}`, xml);
    zip.file(`word/_rels/${target}.rels`, fixedRels);
  });
  zip.file('word/media/hdr_image1.png', img1);
  zip.file('word/media/hdr_image2.jpeg', img2);

  let types = await zip.file('[Content_Types].xml').async('string');
  const need = [['png', 'image/png'], ['jpeg', 'image/jpeg']];
  for (const [ext, ct] of need) {
    if (!new RegExp(`Extension="${ext}"`, 'i').test(types)) types = types.replace('</Types>', `<Default Extension="${ext}" ContentType="${ct}"/></Types>`);
  }
  zip.file('[Content_Types].xml', types);

  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

async function buildPaperDocx(papers) {
  const doc = new Document({
    creator: 'Question Paper Generator',
    title: `${papers[0].meta.subjectCode} ${papers[0].meta.title}`,
    styles: { default: { document: { run: { font: C.FONT, size: 21 } } } },
    sections: papers.map(sectionFor),
  });
  const buf = await Packer.toBuffer(doc);
  return injectHeader(buf, papers);
}

module.exports = { buildPaperDocx };
