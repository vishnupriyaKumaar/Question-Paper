// Answer key / marking scheme document. Verified answers were computed by the built-in engine;
// everything else is flagged "instructor review required" - nothing is invented.
const { Document, Packer, TableRow } = require('docx');
const config = require('../config');
const C = require('./common');
const { para, cell, table, CONTENT_W, AlignmentType, BorderStyle } = C;

const head = (t, w, align = AlignmentType.CENTER) => cell([para(t, { bold: true, size: 19, align })], w, { fill: 'EDEDED' });

function sectionFor(paper, first) {
  const m = paper.meta;
  const kids = [];
  if (first) {
    const logo = C.logoBuffer();
    kids.push(
      logo ? C.logoParagraph(logo, 330) : para(config.college.name, { bold: true, size: 26, align: AlignmentType.CENTER }),
      para(m.department || '', { bold: true, size: 21, align: AlignmentType.CENTER, after: 60, border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: '000000', space: 4 } } })
    );
  }
  kids.push(
    para('ANSWER KEY AND MARKING SCHEME', { bold: true, size: 26, align: AlignmentType.CENTER, before: 120 }),
    para(`${m.subjectCode} - ${m.subjectName}`, { bold: true, size: 22, align: AlignmentType.CENTER }),
    para(`${m.title}  |  SET ${m.set}  |  Maximum Marks: ${m.maxMarks}`, { size: 20, align: AlignmentType.CENTER, after: 120 }),
    para('“Verified” answers were calculated by the generator’s own algorithms. “Instructor review required” means no verified answer exists for that question: prepare the marking scheme from the syllabus / textbook.', { italics: true, size: 18, after: 120 })
  );
  const W = [800, 3300, 4906, 1300];
  const rows = [new TableRow({ tableHeader: true, children: [head('Q.No', W[0]), head('Question', W[1], AlignmentType.LEFT), head('Answer / marking points', W[2], AlignmentType.LEFT), head('Status', W[3])] })];
  for (const part of paper.parts) {
    for (const q of part.questions) {
      const verified = (q.answerStatus === 'verified' || q.answerStatus === 'edited') && q.answer;
      const ans = q.answer && String(q.answer).trim() ? String(q.answer) : `Instructor review required. Marks: ${q.marks}. Suggested scheme: key points from the syllabus topic “${q.topic || ''}”, awarded in proportion to marks.`;
      rows.push(new TableRow({ cantSplit: false, children: [
        cell([para(q.sub ? `${q.no}${q.sub}` : String(q.no), { bold: true, size: 19, align: AlignmentType.CENTER })], W[0]),
        cell(String(q.text).split('\n').map((l) => para(l, { size: 18 })), W[1]),
        cell(ans.split('\n').map((l) => para(l, { size: 18 })), W[2]),
        cell([para(q.answerStatus === 'edited' && q.answer ? 'Edited' : verified ? 'Verified' : 'Review', { bold: true, size: 18, align: AlignmentType.CENTER })], W[3], { fill: verified ? 'E3F4E7' : 'FFF1D6' }),
      ] }));
    }
  }
  kids.push(table(rows, W), para('Prepared by: ________________      Verified by: ________________      HoD/CSE: ________________', { size: 20, before: 300 }));
  return { properties: { page: { size: { width: C.PAGE.width, height: C.PAGE.height }, margin: C.MARGIN } }, children: kids };
}

async function buildAnswerKeyDocx(papers) {
  const doc = new Document({
    creator: 'Question Paper Generator',
    title: `Answer key ${papers[0].meta.subjectCode}`,
    styles: { default: { document: { run: { font: C.FONT, size: 21 } } } },
    sections: papers.map((p, i) => sectionFor(p, i === 0)),
  });
  return Packer.toBuffer(doc);
}
module.exports = { buildAnswerKeyDocx };
