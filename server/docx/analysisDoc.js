// Separate K-level (Bloom's Taxonomy) analysis document.
const { Document, Packer, TableRow, PageBreak, Paragraph } = require('docx');
const config = require('../config');
const { LEVELS, startsWithVerb, leadingVerb } = require('../bloom');
const { PROGRAM_OUTCOMES } = require('../outcomes');
const C = require('./common');
const { run, para, cell, table, CONTENT_W, AlignmentType, BorderStyle } = C;

const head = (t, w, align = AlignmentType.CENTER) => cell([para(t, { bold: true, size: 19, align })], w, { fill: 'EDEDED' });
const body = (t, w, align = AlignmentType.CENTER, o = {}) => cell([para(String(t), { size: 19, align, bold: o.bold })], w, { fill: o.fill });
const h2 = (t) => para(t, { bold: true, size: 22, before: 200, after: 80, keepNext: true });
const pct = (n, d) => (d ? `${((n / d) * 100).toFixed(1)}%` : '0.0%');

function analyse(paper) {
  const qs = paper.parts.flatMap((p) => p.questions.map((q) => ({ ...q, partLetter: p.letter })));
  const byLevel = {};
  for (let k = 1; k <= 6; k++) byLevel[k] = { count: 0, marks: 0 };
  const byCo = {};
  let totalMarks = 0;
  for (const q of qs) {
    const k = Number(q.bl);
    if (byLevel[k]) {
      byLevel[k].count += 1;
      byLevel[k].marks += Number(q.marks);
    }
    byCo[q.co] = byCo[q.co] || { count: 0, marks: 0 };
    byCo[q.co].count += 1;
    byCo[q.co].marks += Number(q.marks);
    totalMarks += Number(q.marks);
  }
  return { qs, byLevel, byCo, totalMarks };
}

function summaryTable(a) {
  const W = [900, 2400, 1600, 2000, 2000, 1306];
  const rows = [
    new TableRow({ tableHeader: true, children: [head('K Level', W[0]), head('Bloom’s Level', W[1]), head('No. of Questions', W[2]), head('Marks (all options)', W[3]), head('% of Marks', W[4]), head('Tick', W[5])] }),
  ];
  const totalCount = a.qs.length;
  for (let k = 1; k <= 6; k++) {
    const r = a.byLevel[k];
    rows.push(
      new TableRow({
        children: [body(`K${k}`, W[0], AlignmentType.CENTER, { bold: true }), body(LEVELS[k].name, W[1], AlignmentType.LEFT), body(r.count, W[2]), body(r.marks, W[3]), body(pct(r.marks, a.totalMarks), W[4]), body(r.count ? '✓' : '-', W[5])],
      })
    );
  }
  rows.push(
    new TableRow({
      children: [body('', W[0], AlignmentType.CENTER, { fill: 'F7F7F7' }), body('Total', W[1], AlignmentType.LEFT, { bold: true, fill: 'F7F7F7' }), body(totalCount, W[2], AlignmentType.CENTER, { bold: true, fill: 'F7F7F7' }), body(a.totalMarks, W[3], AlignmentType.CENTER, { bold: true, fill: 'F7F7F7' }), body('100%', W[4], AlignmentType.CENTER, { bold: true, fill: 'F7F7F7' }), body('', W[5], AlignmentType.CENTER, { fill: 'F7F7F7' })],
    })
  );
  return table(rows, W);
}

function partTable(paper) {
  const W = [2000, 1100, 1100, 1100, 1100, 1100, 1100, 1606];
  const rows = [new TableRow({ tableHeader: true, children: [head('Part', W[0]), ...[1, 2, 3, 4, 5, 6].map((k, i) => head(`K${k}`, W[i + 1])), head('Marks', W[7])] })];
  for (const p of paper.parts) {
    const cnt = [0, 0, 0, 0, 0, 0];
    let marks = 0;
    for (const q of p.questions) {
      cnt[Number(q.bl) - 1] += 1;
      marks += Number(q.marks);
    }
    rows.push(new TableRow({ children: [body(`Part ${p.letter}`, W[0], AlignmentType.LEFT), ...cnt.map((n, i) => body(n || '-', W[i + 1])), body(marks, W[7])] }));
  }
  return table(rows, W);
}

function coTable(paper, a) {
  const W = [900, 6106, 1600, 1600];
  const rows = [new TableRow({ tableHeader: true, children: [head('CO', W[0]), head('Course Outcome', W[1]), head('Questions', W[2]), head('Marks', W[3])] })];
  const outcomes = paper.outcomes || [];
  const keys = [...new Set([...outcomes.map((o) => o.co), ...Object.keys(a.byCo)])].sort();
  for (const co of keys) {
    const o = outcomes.find((x) => x.co === co);
    const r = a.byCo[co] || { count: 0, marks: 0 };
    rows.push(new TableRow({ children: [body(co, W[0], AlignmentType.CENTER, { bold: true }), body(o ? o.text : '-', W[1], AlignmentType.LEFT), body(r.count || '-', W[2]), body(r.marks || '-', W[3])] }));
  }
  return table(rows, W);
}

function poTable(a) {
  const W = [900, 5106, 2100, 2100];
  const by = {};
  for (const q of a.qs) {
    by[q.po] = by[q.po] || { count: 0, marks: 0 };
    by[q.po].count += 1;
    by[q.po].marks += Number(q.marks);
  }
  const rows = [new TableRow({ tableHeader: true, children: [head('PO', W[0]), head('Programme Outcome', W[1], AlignmentType.LEFT), head('Questions', W[2]), head('Marks', W[3])] })];
  for (const po of PROGRAM_OUTCOMES) {
    const r = by[po.code];
    if (!r) continue;
    rows.push(new TableRow({ children: [body(po.code, W[0], AlignmentType.CENTER, { bold: true }), body(po.name, W[1], AlignmentType.LEFT), body(r.count, W[2]), body(r.marks, W[3])] }));
  }
  return table(rows, W);
}

function poReferenceTable() {
  const W = [900, 2600, CONTENT_W - 3500];
  const rows = [new TableRow({ tableHeader: true, children: [head('PO', W[0]), head('Programme Outcome', W[1], AlignmentType.LEFT), head('Statement', W[2], AlignmentType.LEFT)] })];
  for (const po of PROGRAM_OUTCOMES) {
    rows.push(new TableRow({ cantSplit: true, children: [body(po.code, W[0], AlignmentType.CENTER, { bold: true }), body(`${po.name} (${po.domain})`, W[1], AlignmentType.LEFT), body(po.text, W[2], AlignmentType.LEFT)] }));
  }
  return table(rows, W);
}

function questionTable(a) {
  const W = [800, 4406, 800, 800, 800, 1500, 1100];
  const rows = [new TableRow({ tableHeader: true, children: [head('Q.No', W[0]), head('Question', W[1]), head('Marks', W[2]), head('CO', W[3]), head('K Level', W[4]), head('Action Verb', W[5]), head('Verb Check', W[6])] })];
  for (const q of a.qs) {
    const ok = startsWithVerb(q.text, Number(q.bl));
    const verb = q.verb || leadingVerb(q.text, Number(q.bl)) || String(q.text).split(' ')[0];
    rows.push(
      new TableRow({
        cantSplit: true,
        children: [
          body(q.sub ? `${q.no} ${q.sub}` : q.no, W[0], AlignmentType.CENTER, { bold: true }),
          cell(String(q.text).split('\n').map((l) => para(l, { size: 19 })), W[1]),
          body(q.marks, W[2]),
          body(q.co, W[3]),
          body(`K${q.bl}`, W[4]),
          body(verb, W[5]),
          body(ok ? '✓ Valid' : '✗ Check', W[6]),
        ],
      })
    );
  }
  return table(rows, W);
}

function referenceTable() {
  const W = [900, 2000, CONTENT_W - 2900];
  const rows = [new TableRow({ tableHeader: true, children: [head('K Level', W[0]), head('Name', W[1]), head('Definition', W[2], AlignmentType.LEFT)] })];
  for (let k = 1; k <= 6; k++) rows.push(new TableRow({ cantSplit: true, children: [body(`K${k}`, W[0], AlignmentType.CENTER, { bold: true }), body(LEVELS[k].name, W[1], AlignmentType.LEFT), body(LEVELS[k].definition, W[2], AlignmentType.LEFT)] }));
  return table(rows, W);
}

function sectionFor(paper, first) {
  const m = paper.meta;
  const a = analyse(paper);
  const kids = [];
  if (first) {
    const logo = C.logoBuffer();
    kids.push(
      logo ? C.logoParagraph(logo, 330) : para(config.college.name.toUpperCase().replace('TIRUTTANI', 'Tiruttani'), { bold: true, size: 26, align: AlignmentType.CENTER }),
      para(m.department, { bold: true, size: 21, align: AlignmentType.CENTER, after: 60, border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: '000000', space: 4 } } })
    );
  }
  kids.push(
    para('K-LEVEL ANALYSIS (BLOOM’S TAXONOMY)', { bold: true, size: 26, align: AlignmentType.CENTER, before: 120 }),
    para(`${m.subjectCode} - ${m.subjectName}${m.regulation ? ` (Regulations ${m.regulation})` : ''}`, { bold: true, size: 22, align: AlignmentType.CENTER }),
    para(`${m.title}  |  SET ${m.set}  |  Maximum Marks: ${m.maxMarks}  |  ${m.academicYear}`, { size: 20, align: AlignmentType.CENTER, after: 120 }),
    h2('1. K-Level wise distribution'),
    summaryTable(a),
    para('Marks are counted for every question option shown in the paper (both the "a" and "b" option of an Either/Or pair), so the total can exceed the Maximum Marks.', { italics: true, size: 17, before: 40 }),
    h2('2. Part-wise K-Level distribution (number of questions)'),
    partTable(paper),
    h2('3. Course Outcome coverage'),
    coTable(paper, a),
    h2('4. Programme Outcome coverage'),
    poTable(a),
    h2('5. Question-wise analysis'),
    questionTable(a)
  );
  return { properties: { page: { size: { width: C.PAGE.width, height: C.PAGE.height }, margin: C.MARGIN } }, children: kids };
}

async function buildAnalysisDocx(papers) {
  const sections = papers.map((p, i) => sectionFor(p, i === 0));
  // Reference table at the end of the final section
  sections[sections.length - 1].children.push(h2('Bloom’s Taxonomy K-Levels (reference)'), referenceTable(), para('Prepared by: ________________      Verified by: ________________      HoD/CSE: ________________', { size: 20, before: 400 }));
  const doc = new Document({
    creator: 'Question Paper Generator',
    title: `K-Level Analysis ${papers[0].meta.subjectCode}`,
    styles: { default: { document: { run: { font: C.FONT, size: 21 } } } },
    sections,
  });
  return Packer.toBuffer(doc);
}

module.exports = { buildAnalysisDocx, analyse };
