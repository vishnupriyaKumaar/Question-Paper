const fs = require('fs');
const path = require('path');
const {
  Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType, ShadingType, VerticalAlign,
} = require('docx');

const FONT = 'Times New Roman';
const PAGE = { width: 11906, height: 16838 }; // A4
const MARGIN = { top: 700, bottom: 700, left: 850, right: 850 };
const CONTENT_W = PAGE.width - MARGIN.left - MARGIN.right; // 10206

const line = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const BORDERS = { top: line, bottom: line, left: line, right: line };
const NO_BORDERS = { top: none, bottom: none, left: none, right: none };

function run(text, o = {}) {
  return new TextRun({ text: String(text), font: FONT, size: o.size || 21, bold: o.bold, italics: o.italics, underline: o.underline ? {} : undefined, color: o.color });
}

function para(children, o = {}) {
  const kids = Array.isArray(children) ? children : [run(children, o)];
  return new Paragraph({
    children: kids,
    alignment: o.align || AlignmentType.LEFT,
    spacing: { before: o.before ?? 0, after: o.after ?? 0, line: o.line },
    border: o.border,
    tabStops: o.tabStops,
    keepNext: o.keepNext,
  });
}

function cell(children, width, o = {}) {
  const paras = (Array.isArray(children) ? children : [children]).map((c) => (typeof c === 'string' ? para(c, o) : c));
  return new TableCell({
    children: paras.length ? paras : [para('')],
    width: { size: width, type: WidthType.DXA },
    columnSpan: o.span,
    borders: o.borders || BORDERS,
    verticalAlign: o.valign || VerticalAlign.CENTER,
    shading: o.fill ? { type: ShadingType.CLEAR, fill: o.fill, color: 'auto' } : undefined,
    margins: { top: o.padV ?? 50, bottom: o.padV ?? 50, left: 90, right: 90 },
  });
}

function table(rows, widths, o = {}) {
  return new Table({
    width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA },
    columnWidths: widths,
    rows,
    borders: o.borders,
  });
}

// The wide GRT logo (shield + college name). Returns the PNG bytes and its pixel size.
function logoBuffer() {
  const p = path.join(__dirname, '..', 'assets', 'grt-logo.png');
  try {
    const data = fs.readFileSync(p);
    return { data, width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
  } catch {
    return null;
  }
}

// Paragraph holding the logo, scaled to the given display width (pixels).
function logoParagraph(logo, widthPx, o = {}) {
  const { Paragraph: P, ImageRun } = require('docx');
  return new P({
    alignment: AlignmentType.CENTER,
    spacing: { before: o.before ?? 40, after: o.after ?? 40 },
    children: [
      new ImageRun({
        type: 'png',
        data: logo.data,
        transformation: { width: widthPx, height: Math.round((widthPx * logo.height) / logo.width) },
        altText: { title: 'GRT logo', description: 'GRT Institute of Engineering and Technology, Tiruttani', name: 'grt-logo' },
      }),
    ],
  });
}

module.exports = { FONT, PAGE, MARGIN, CONTENT_W, BORDERS, NO_BORDERS, run, para, cell, table, logoBuffer, logoParagraph, AlignmentType, BorderStyle };
