// Previous-year / important questions: turn the uploaded text into a list of questions,
// tag each one (unit, Bloom level, sum or theory), and pick the ones that fit a paper slot.
const { detectLevel, stripLead } = require('./bloom');

const STOP = new Set('about above after again against among because before being below between both cannot could does doing during each from further have having here itself just more most much must only other over same should since some such than that their them then there these they this those through under until very were what when where which while will with within without would your explain describe define discuss list write give briefly detail details suitable example examples diagram'.split(' '));

const JUNK = /^(time\s*:|maximum\s*marks|max\.?\s*marks|date\s*:|reg\.?\s*no|part\s*[-–—]?\s*[a-f]\b|answer\s+all|answer\s+any|course\s+outcomes?|upon\s+successful|academic\s+year|department\s+of|set\s*[-–—]?\s*[ab]\b|q\.?\s*no|assessment\s+test|model\s+(test|exam)|semester|regulations?|instructions?|note\s*:|\(?an\s+autonomous|approved\s+by|accredited\s+by|grt\s+institute|course\s+coordinator|faculty\s+in-?charge|hod\b|\d+\s*[x×]\s*\d+\s*=)/i;
const TAGS_ONLY = /^(?:(?:co|po|k|bl)\s*-?\s*\d{1,2}\s*)+$/i;
const NUM_ONLY = /^\(?\s*(\d{1,2})\s*\)?\s*([ab]\)?)?\s*$/i;
const NUM_LEAD = /^\s*(?:q\.?\s*)?(\d{1,2})\s*[.):\-–]?\s*(?:\(?([ab])[.)]?\s+)?(?=\S)/i;
const AB_LEAD = /^\s*\(?([ab])[.)]\s+(?=\S)/i;
const SUB_LEAD = /^\s*\(?(?:i{1,3}|iv|v|vi)\)\s+/i;

const TAG_TOK = /^(?:co|po|bl|k)\s*-?\d{1,2}$/i;
const PLAIN_NUM = /^\d{1,2}$/;
/** Remove trailing "CO1 PO2 3" style tags (linear time, no backtracking). */
function stripTags(t) {
  const tok = String(t).trim().split(/\s+/);
  let j = tok.length;
  while (j > 0 && (TAG_TOK.test(tok[j - 1]) || PLAIN_NUM.test(tok[j - 1]))) j -= 1;
  while (j < tok.length && PLAIN_NUM.test(tok[j])) j += 1; // keep real numbers that sit before the first tag
  if (j >= tok.length) return tok.join(' ');
  return tok.slice(0, j).join(' ');
}

function cleanText(t) {
  return stripTags(
    String(t)
      .replace(/\s*\(\d{1,2}\)(?=\s*[A-Za-z. ]{0,20}\|)/g, '')
      .replace(/\s*\(\s*\d{1,2}\s*(?:marks?|m)?\s*\)\s*$/i, '')
      .replace(/\s*\[\s*\d{1,2}\s*(?:marks?|m)?\s*\]\s*$/i, '')
      .replace(/\s+/g, ' ')
      .replace(/(?:\s*(?:CO|PO)\d{0,2}){1,4}\s*\d?\s*$/, '')
  ).trim();
}

function words(t) {
  return String(t).toLowerCase().match(/[a-z][a-z\-]{3,}/g)?.filter((w) => !STOP.has(w)) || [];
}

function isSum(t) {
  const s = String(t);
  const nums = (s.match(/\d+(?:\.\d+)?/g) || []).length;
  if (nums >= 3 && s.length > 70 && /\b(find|calculate|compute|determine|evaluate|test|probability|mean|variance|draw|estimate|solve|obtain|prove|show that)\b/i.test(s)) return true;
  if (/\d+\s*[+\-*/=^×÷]\s*\d+|\b[a-z]\s*=\s*\d|\bx\s*\^?\s*\d|\d+\s*(?:%|kg|km|cm|mm|ms|hz|v|a|ω|ohm|m\/s|rpm)\b/i.test(s)) return true;
  return /\b(solve|calculate|compute|find the (?:value|sum|product|area|volume|probability|mean|median|mode|roots?|solution|current|voltage|power|transfer|shortest|minimum|maximum)|determine the (?:value|result|roots?|current|voltage|power)|evaluate|simplify|differentiate|integrate|derive|prove that|numerical|problem)\b/i.test(s) && /[\d=^∫Σ√{}]|->/.test(s);
}

const LABEL = /^(?:q\.?\s*)?(\d{1,2})\s*[.):\-–]?\s*\(?([ab])?\)?\s*(?:\(?(i{1,3}|iv|v|vi)\))?$/i;
const SUB_ONLY = /^\(?(?:i{1,3}|iv|v|vi)\)$/i;
const OR_LINE = /^[\[(]?\s*or\s*[\])]?$/i;

/** Split raw text into question strings. Handles numbered lines, "11a(i)" table rows and un-numbered lists. */
function splitQuestions(text) {
  const lines = String(text || '').replace(/\r/g, '\n').split('\n').map((l) => l.replace(/[ ]+/g, ' ').trim());
  const out = [];
  let cur = null;
  const flush = () => { if (cur && cur.t.trim()) out.push(cur.t.trim()); cur = null; };
  let marker = 0;
  for (const raw of lines) {
    if (!raw) continue;
    let cells = raw.split('\t').map((c) => c.trim()).filter(Boolean);
    if (!cells.length) continue;
    while (cells.length > 1 && (TAGS_ONLY.test(cells[cells.length - 1]) || PLAIN_NUM.test(cells[cells.length - 1]))) cells.pop();
    const joined = cells.join(' ');
    if (OR_LINE.test(joined)) { flush(); continue; }
    if (JUNK.test(joined) || TAGS_ONLY.test(joined)) { if (JUNK.test(joined)) flush(); continue; }
    const tabbed = cells.length > 1;
    if (tabbed && SUB_ONLY.test(cells[0]) && cur && (cells.slice(1).join(' ').match(/[a-z]/gi) || []).length < 25) { cur.t += ' ' + cells.slice(1).join(' '); continue; }
    if (tabbed && SUB_ONLY.test(cells[0])) { flush(); marker++; cur = { t: cells.slice(1).join(' ') }; continue; }
    if (tabbed && LABEL.test(cells[0])) { flush(); marker++; cur = { t: cells.slice(1).join(' ') }; continue; }
    const line = joined;
    if (NUM_ONLY.test(line)) { flush(); cur = { t: '' }; marker++; continue; }
    const m = NUM_LEAD.exec(line) || AB_LEAD.exec(line);
    if (m && !SUB_LEAD.test(line)) {
      flush(); marker++;
      cur = { t: line.slice(m[0].length) };
      continue;
    }
    if (!cur) cur = { t: '' };
    cur.t += (SUB_LEAD.test(line) ? '\n' : ' ') + line;
  }
  flush();
  let qs = out;
  if (marker < 3) {
    qs = lines.map((l) => stripTags(l.replace(/\t/g, ' '))).filter((l) => l.length >= 18 && !JUNK.test(l) && !TAGS_ONLY.test(l) && (/\?\s*$/.test(l) || detectLevel(l) > 0));
  }
  return qs;
}

/**
 * Change the numbers of a worked problem a little (one common scale factor, so ratios and
 * comparisons stay true). Skips tables, powers and probabilities. Returns {text, changed}.
 */
function varyNumbers(text) {
  const s = String(text);
  if (/[|^]/.test(s)) return { text: s, changed: false };
  const f = [0.8, 0.9, 1.1, 1.2, 1.25, 1.5][Math.floor(Math.random() * 6)];
  let changed = false;
  const out = s.replace(/(?<![A-Za-z0-9_.^\/(])(\d+(?:\.\d+)?)(?![A-Za-z0-9_^\/)%]|\.\d)/g, (m, num, off, str) => {
    const v = Number(num);
    const after = str.slice(off + m.length, off + m.length + 8);
    if (v < 20 || (v >= 1900 && v <= 2100) || /^\s*(marks?|%)/i.test(after)) return m;
    const dec = (num.split('.')[1] || '').length;
    let nv = v * f;
    nv = dec ? Number(nv.toFixed(dec)) : Math.round(nv / (v >= 100 ? 10 : 1)) * (v >= 100 ? 10 : 1);
    if (nv === v) return m;
    changed = true;
    return String(nv);
  });
  return { text: out, changed };
}

/** @returns {{text:string, level:number, isSum:boolean, words:string[], marks:number|null}[]} */
function parseQuestions(text) {
  const seen = new Set();
  const res = [];
  for (const raw of splitQuestions(text)) {
    const tail = /\(\s*(\d{1,2})\s*(?:marks?|m)?\s*\)\s*$/i.exec(raw.split('\n').pop());
    const t = raw.split('\n').map((l) => cleanText(l)).filter(Boolean).join('\n');
    if (t.length < 14 || t.length > 1800) continue;
    if ((t.match(/[a-z]/gi) || []).length < 15) continue;
    const key = t.toLowerCase().replace(/\W+/g, ' ');
    if (seen.has(key)) continue;
    seen.add(key);
    res.push({ text: t, level: detectLevel(stripLead(t.split('\n')[0])), isSum: isSum(t), words: [...new Set(words(t))], marks: tail ? Number(tail[1]) : null });
  }
  return res;
}

/** Tag each question with the syllabus unit whose wording it overlaps the most. */
function tagUnits(questions, unitWords) {
  for (const q of questions) {
    let best = 0;
    let bestU = null;
    for (const [u, set] of Object.entries(unitWords)) {
      let n = 0;
      for (const w of q.words) if (set.has(w)) n += 1;
      if (n > best) { best = n; bestU = Number(u); }
    }
    q.unit = best >= 1 ? bestU : null;
    q.unitScore = best;
  }
  return questions;
}

function unitWordSets(unitTexts) {
  const out = {};
  for (const [u, t] of Object.entries(unitTexts)) out[u] = new Set(words(t));
  return out;
}

function summarize(text) {
  const qs = parseQuestions(text);
  return { count: qs.length, sums: qs.filter((q) => q.isSum).length, sample: qs.slice(0, 6).map((q) => q.text.replace(/\n/g, ' ').slice(0, 140)) };
}

/**
 * Choose bank questions for items. Returns Map(item.id -> question).
 * item: {id, marks, level, unit, isSum, scopeTopics}
 */
function pickFromBank(items, bank, percent, { used = new Set(), taken = new Set() } = {}) {
  const want = Math.round((items.length * Math.max(0, Math.min(100, percent))) / 100);
  const picks = new Map();
  if (!want || !bank.length) return { picks, want, got: 0 };
  const order = items.slice().sort(() => Math.random() - 0.5);
  for (const item of order) {
    if (picks.size >= want) break;
    let best = null;
    let bestScore = -Infinity;
    const scope = new Set((item.scopeTopics || []).flatMap((t) => words(t)));
    for (const q of bank) {
      if (used.has(q.text)) continue;
      if (q.unit && item.unit && q.unit !== item.unit) continue;
      if (item.isSum !== q.isSum) continue; // sums only where a sum was asked for, and only there
      let s = Math.random();
      s += q.unit === item.unit ? 4 : 0.5;
      if (q.level) s += q.level === item.level ? 3 : Math.abs(q.level - item.level) === 1 ? 1 : -1;
      else s -= 1;
      const len = q.text.length;
      s += item.marks <= 3 ? (len <= 150 ? 1 : -2) : (len >= 45 ? 1 : -1.5);
      if (q.marks && Math.abs(q.marks - item.marks) <= 1) s += 1.5;
      if (scope.size) { let ov = 0; for (const w of q.words) if (scope.has(w)) ov += 1; s += Math.min(ov, 3) * 0.7; }
      if (taken.has(q.text.toLowerCase())) s -= 3;
      if (s > bestScore) { bestScore = s; best = q; }
    }
    if (best) { picks.set(item.id, best); used.add(best.text); }
  }
  return { picks, want, got: picks.size };
}

module.exports = { varyNumbers, stripTags, parseQuestions, tagUnits, unitWordSets, summarize, pickFromBank, isSum };
