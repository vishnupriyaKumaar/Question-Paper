const path = require('path');

const MAX_CHARS = 300000; // keeps the Firestore document under its 1 MiB limit

async function extractText(files, { keepTabs = false, report } = {}) {
  const list = (Array.isArray(files) ? files : [files]).slice().sort((x, y) => String(x.originalname).localeCompare(String(y.originalname), undefined, { numeric: true }));
  const { readFile } = require('./reader');
  const parts = [];
  const problems = [];
  for (const f of list) {
    try {
      const t = await readFile(f);
      if (t && t.trim()) parts.push(t);
      else problems.push(`${f.originalname}: no readable text found`);
    } catch (e) {
      problems.push(`${f.originalname}: ${e && e.message ? e.message : 'could not be read'}`);
    }
  }
  if (report) report.problems = problems;
  if (!parts.length && problems.length) {
    const err = new Error(problems.join(' | ').slice(0, 600));
    err.status = 400;
    throw err;
  }
  return normalize(parts.join('\n\n'), keepTabs);
}

function normalize(text, keepTabs = false) {
  return String(text)
    .replace(/\r/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(keepTabs ? /[ ]*\t[ \t]*/g : /[ \t]+/g, keepTabs ? '\t' : ' ')
    .replace(/[ ]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, MAX_CHARS);
}

const UNIT_RE = /^\s*(?:UNIT|MODULE|CHAPTER)\s*[-–—:.]?\s*([IVXLC]+|\d+)\b[\s:.\-–—]*(.*)$/i;
const END_RE = /^\s*(TEXT\s*BOOKS?|REFERENCES?|REFERENCE\s*BOOKS?|COURSE\s*OUTCOMES?|TOTAL\b|SUGGESTED\s*ACTIVITIES)/i;

// Split syllabus text into units. Falls back to 5 equal chunks when no
// "UNIT I / UNIT 1" headings are found.
function splitUnits(text) {
  const lines = text.split('\n');
  const units = [];
  let cur = null;
  for (const line of lines) {
    const m = line.match(UNIT_RE);
    if (m) {
      // drop the trailing period/hour count that follows unit headings (e.g. "RELATIONAL DATABASES 9")
      const title = (m[2] || '').replace(/\s+\d{1,2}\s*$/, '').trim();
      cur = { n: units.length + 1, title, lines: [] };
      units.push(cur);
      continue;
    }
    if (cur && END_RE.test(line) && units.length >= 1) {
      cur = null; // text after the last unit (books, references) is ignored
      continue;
    }
    if (cur && line.trim()) cur.lines.push(line.trim());
  }

  let usable = units.filter((u) => u.lines.join(' ').length > 20 || u.title.length > 8);
  let fallback = false;
  if (usable.length < 2) {
    fallback = true;
    const all = lines.map((l) => l.trim()).filter(Boolean);
    const size = Math.max(1, Math.ceil(all.length / 5));
    usable = [];
    for (let i = 0; i < 5 && i * size < all.length; i++) {
      usable.push({ n: i + 1, title: `Part ${i + 1}`, lines: all.slice(i * size, (i + 1) * size) });
    }
  }
  usable.forEach((u, i) => (u.n = i + 1));
  return {
    fallback,
    units: usable.map((u) => ({ n: u.n, title: u.title || `Unit ${u.n}`, text: (u.lines.length ? u.lines : [u.title]).join('\n') })),
  };
}

const STOP = new Set(['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'and', 'or', 'the', 'of', 'etc', 'other', 'others', 'introduction', 'overview', 'concepts', 'basics']);
const NOISE = /(text\s*book|reference|isbn|publication|edition|periods?|hours?|total|unit\s+[ivx\d]+|\bL\s*:|\bT\s*:|\bP\s*:)/i;

function cleanTopic(raw) {
  let t = raw
    .replace(/\(.*?\)/g, ' ')
    .replace(/^[\s\d.)\-–—•·●▪(i-vx]+(?=[A-Za-z])/i, (m) => (/^[\s\d.)\-–—•·●▪]+$/.test(m) ? '' : m))
    .replace(/\s+/g, ' ')
    .replace(/[.:]+$/, '')
    .trim();
  return t;
}

function extractTopics(unitText) {
  const body = unitText.split('\n').join(' ; ');
  const parts = body.split(/[;,:|•·●▪]|\.\s+|\s[–—-]\s/);
  const seen = new Set();
  const out = [];
  for (const p of parts) {
    const t = cleanTopic(p);
    if (!t || NOISE.test(t)) continue;
    const words = t.split(' ');
    if (words.every((w) => STOP.has(w.toLowerCase().replace(/[^a-z]/g, '')))) continue;
    if (t.length < 4 || words.length > 9 || /^\d+$/.test(t) || !/[a-z]/i.test(t)) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t.charAt(0).toUpperCase() + t.slice(1));
  }
  if (out.length < 3) {
    // very short/long unit lines: keep truncated phrases so the unit is never empty
    for (const p of parts) {
      const t = cleanTopic(p).split(' ').slice(0, 8).join(' ');
      const key = t.toLowerCase();
      if (t.length >= 4 && /[a-z]/i.test(t) && !seen.has(key)) {
        seen.add(key);
        out.push(t.charAt(0).toUpperCase() + t.slice(1));
      }
    }
  }
  return out;
}

function summarize(text) {
  const { units, fallback } = splitUnits(text);
  return {
    fallback,
    chars: text.length,
    units: units.map((u) => ({ n: u.n, title: u.title, topicCount: extractTopics(u.text).length })),
  };
}

module.exports = { extractText, normalize, splitUnits, extractTopics, summarize };
