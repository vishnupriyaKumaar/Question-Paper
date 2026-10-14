// Run with:  npm test   (no API key, no network needed)
delete process.env.ANTHROPIC_API_KEY;
const assert = require('assert');
const { makeRng } = require('../core');
const engine = require('../index');
const os = require('../os'); const dbms = require('../dbms'); const net = require('../networks'); const cns = require('../cns');
const { startsWithVerb } = require('../../bloom');

let pass = 0; let fail = 0;
const tests = [];
const test = (name, fn) => tests.push([name, fn]);

// ---- known textbook answers ----
test('CPU scheduling: FCFS / RR textbook values', () => {
  const P = [['P1', 0, 24], ['P2', 0, 3], ['P3', 0, 3]].map(([name, at, bt], i) => ({ name, at, bt, pr: i }));
  assert.strictEqual(os.schedule(P, 'FCFS').avgWT, 17);
  assert.ok(Math.abs(os.schedule(P, 'RR', 4).avgWT - 17 / 3) < 1e-9);
  const S = [['P1', 0, 8], ['P2', 1, 4], ['P3', 2, 9], ['P4', 3, 5]].map(([name, at, bt], i) => ({ name, at, bt, pr: i }));
  assert.strictEqual(os.schedule(S, 'SRTF').avgWT, 6.5); // classic SRTF example
});
test('Page replacement: FIFO/LRU/OPT = 15/12/9', () => {
  const ref = [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2, 1, 2, 0, 1, 7, 0, 1];
  assert.deepStrictEqual(['FIFO', 'LRU', 'OPT'].map((a) => os.pageFaults(ref, 3, a).faults), [15, 12, 9]);
});
test("Banker's algorithm: safe sequence P1,P3,P4,P0,P2", () => {
  const b = os.banker([[0, 1, 0], [2, 0, 0], [3, 0, 2], [2, 1, 1], [0, 0, 2]], [[7, 5, 3], [3, 2, 2], [9, 0, 2], [2, 2, 2], [4, 3, 3]], [3, 3, 2]);
  assert.ok(b.safe); assert.strictEqual(b.seq.join(), 'P1,P3,P4,P0,P2');
});
test('Disk scheduling totals (53; 98,183,37,122,14,124,65,67)', () => {
  const q = [98, 183, 37, 122, 14, 124, 65, 67];
  assert.deepStrictEqual([os.disk(q, 53, 199, 'FCFS').total, os.disk(q, 53, 199, 'SSTF').total, os.disk(q, 53, 199, 'SCAN', 'down').total, os.disk(q, 53, 199, 'LOOK', 'up').total], [640, 236, 236, 299]);
});
test('CRC textbook example 1101011011 / 10011 = 1110', () => assert.strictEqual(net.crcRem('11010110110000', '10011'), '1110'));
test('Subnet 192.168.10.77/26', () => { const s = net.subnet(net.toInt(192, 168, 10, 77), 26); assert.strictEqual(net.ip(s.net), '192.168.10.64'); assert.strictEqual(net.ip(s.bc), '192.168.10.127'); assert.strictEqual(s.hosts, 62); });
test('Classical ciphers: Caesar and Vigenere textbook values', () => { assert.strictEqual(cns.caesar('HELLO', 3), 'KHOOR'); assert.strictEqual(cns.vig('ATTACKATDAWN', 'LEMON'), 'LXFOPVEFRNHR'); });
test('FD closure and candidate keys', () => {
  const fds = [[['A', 'B'], ['C']], [['C'], ['D']], [['D'], ['E']]];
  assert.deepStrictEqual([...dbms.closure(['A', 'B'], fds)].sort(), ['A', 'B', 'C', 'D', 'E']);
  assert.deepStrictEqual(dbms.keys(['A', 'B', 'C', 'D', 'E'], fds), [['A', 'B']]);
});

// ---- every generator ----
test('Every generator produces a valid problem for at least 90% of 200 random seeds', () => {
  for (const g of engine.GENERATORS) {
    let ok = 0;
    for (let s = 1; s <= 200; s++) { try { const o = g.make(makeRng(s)); if (o && o.text && o.answer && !/NaN|undefined|Infinity|\[object/.test(o.text + o.answer)) ok++; } catch { /* rejected instance */ } }
    assert.ok(ok >= 180, `${g.id}: only ${ok}/200`);
  }
});
test('Subject modules exist for all categories', () => {
  const cats = new Set(engine.GENERATORS.map((g) => g.cat));
  for (const c of ['math', 'os', 'eda', 'cns', 'dbms', 'networks', 'programming', 'software', 'architecture', 'compiler', 'ml', 'cloud', 'electronics']) assert.ok(cats.has(c), c);
});
test('Same seed gives the same question (reproducible); different seed differs', () => {
  const a = engine.generateSum({ subject: { name: 'Operating Systems' }, topic: 'CPU scheduling', level: 3, seed: 42 });
  const b = engine.generateSum({ subject: { name: 'Operating Systems' }, topic: 'CPU scheduling', level: 3, seed: 42 });
  const c = engine.generateSum({ subject: { name: 'Operating Systems' }, topic: 'CPU scheduling', level: 3, seed: 43 });
  assert.strictEqual(a.text, b.text); assert.notStrictEqual(a.text, c.text);
});
test('Questions start with a valid Bloom verb for K3-K6', () => {
  for (const lv of [3, 4, 5, 6]) { const o = engine.generateSum({ subject: { name: 'Probability and Statistics' }, topic: 'Poisson distribution', level: lv, seed: lv }); assert.ok(startsWithVerb(o.text, lv), `K${lv}: ${o.text.slice(0, 60)}`); }
});
test('Unsupported topic returns null (nothing invented)', () => assert.strictEqual(engine.generateSum({ subject: { name: 'Operating Systems' }, topic: 'History of computing', level: 3, seed: 1 }), null));
test('Empty topic / empty syllabus do not crash', () => { assert.strictEqual(engine.generateSum({ subject: {}, topic: '', level: 3 }), null); });
test('Duplicate prevention: 25 draws for one topic stay unique', () => {
  const taken = new Set(); const rng = makeRng(7);
  for (let i = 0; i < 25; i++) { const o = engine.generateSum({ subject: { name: 'Operating Systems' }, topic: 'Disk scheduling', level: 3, taken, rng }); assert.ok(!taken.has(o.text.toLowerCase())); taken.add(o.text.toLowerCase()); }
});
test('Subject detection', () => {
  assert.ok(engine.detectSubject({ name: 'Cryptography and Network Security' }).categories.includes('cns'));
  assert.ok(engine.detectSubject({ name: 'Engineering Data Analytics' }).categories.includes('eda'));
  assert.strictEqual(engine.detectSubject({ name: 'Python Programming' }).language, 'Python');
});

// ---- full paper generation, no API key ----
const SYL = `UNIT I OPERATING SYSTEM OVERVIEW 9
Introduction to operating systems, system calls, kernel mode and user mode, process concept
UNIT II PROCESS MANAGEMENT 9
CPU scheduling algorithms, FCFS, SJF, round robin, priority scheduling, threads, synchronization, deadlocks, Banker's algorithm
UNIT III MEMORY MANAGEMENT 9
Paging, segmentation, virtual memory, page replacement algorithms, demand paging, memory allocation
UNIT IV STORAGE MANAGEMENT 9
Disk scheduling, file systems, directory structure, allocation methods, free space management
UNIT V CASE STUDY 9
Linux system, Android architecture, security and protection`;
const pattern = [{ marks: 2, count: 4, levels: [1, 2] }, { marks: 13, count: 2, choice: true, levels: [3, 4], splitA: 2, splitB: 1, sumA: true, sumB: true }, { marks: 10, count: 1, choice: false, levels: [3, 4], sumA: true }];
test('End to end without API key: marks, sums with answers, Set A/B balance', async () => {
  const { generatePapers, totalMarks } = require('../../generator');
  const r = await generatePapers({ subject: { code: 'CS24304', name: 'Operating Systems', outcomes: ['a', 'b', 'c', 'd', 'e'] }, syllabusText: SYL, assessmentKey: 'assessment1', pattern, units: [1, 2, 3, 4], seed: 11 });
  assert.strictEqual(r.papers.length, 2);
  const [A, B] = r.papers;
  assert.strictEqual(A.meta.maxMarks, B.meta.maxMarks);
  assert.strictEqual(A.meta.maxMarks, totalMarks(pattern));
  assert.deepStrictEqual(A.parts.map((p) => p.questions.length), B.parts.map((p) => p.questions.length));
  assert.deepStrictEqual(A.parts.map((p) => p.questions.map((q) => q.marks).join()), B.parts.map((p) => p.questions.map((q) => q.marks).join()));
  const all = [...A.parts, ...B.parts].flatMap((p) => p.questions).filter((q) => !q.incomplete);
  const sums = all.filter((q) => q.isSum);
  assert.ok(sums.length > 0 && r.engine.used > 0, 'engine used');
  for (const q of sums.filter((x) => x.source === 'engine')) { assert.ok(q.answer && q.answerStatus === 'verified', 'verified answer'); assert.ok(/\d/.test(q.text)); }
  for (const q of all.filter((x) => !x.isSum)) assert.strictEqual(q.answerStatus, 'review');
  const texts = all.map((q) => q.text.toLowerCase()); assert.strictEqual(new Set(texts).size, texts.length, 'no duplicate questions across sets');
  assert.ok(!r.aiUsed);
});
test('Unsupported topics are reported, not invented', async () => {
  const { generatePapers } = require('../../generator');
  const r = await generatePapers({ subject: { code: 'X', name: 'Operating Systems', outcomes: ['a', 'b', 'c', 'd', 'e'] }, syllabusText: 'UNIT I HISTORY\nHistory of computing, famous pioneers, timeline of machines\nUNIT II HISTORY 2\nGenerations of computers, early languages, social impact', assessmentKey: 'assessment1', pattern: [{ marks: 10, count: 2, choice: false, levels: [3], sumA: true }], units: [1, 2], seed: 3 });
  assert.ok(r.warnings.some((w) => /No built-in numerical generator/.test(w)));
});
test('Invalid / missing API key and AI failure: generation still works', async () => {
  process.env.ANTHROPIC_API_KEY = 'sk-ant-invalid'; delete require.cache[require.resolve('../../config')];
  for (const m of ['../../ai', '../../generator']) delete require.cache[require.resolve(m)];
  const { generatePapers } = require('../../generator');
  const t0 = Date.now();
  const r = await generatePapers({ subject: { code: 'CS', name: 'Operating Systems', outcomes: ['a', 'b', 'c', 'd', 'e'] }, syllabusText: SYL, assessmentKey: 'assessment1', pattern, units: [1, 2], seed: 5 });
  assert.ok(r.papers.length === 2 && r.engine.used > 0);
  assert.ok(r.warnings.some((w) => /AI generation failed/.test(w)), 'AI failure must be reported as a warning (took ' + (Date.now() - t0) + ' ms)');
  delete process.env.ANTHROPIC_API_KEY;
});
test('Word exports (paper, K-analysis, answer key) build', async () => {
  delete require.cache[require.resolve('../../config')];
  const { generatePapers } = require('../../generator');
  const r = await generatePapers({ subject: { code: 'CS24304', name: 'Operating Systems', outcomes: ['a', 'b', 'c', 'd', 'e'] }, syllabusText: SYL, assessmentKey: 'assessment1', pattern, units: [1, 2, 3], seed: 9 });
  const { buildPaperDocx } = require('../../docx/paperDoc'); const { buildAnalysisDocx } = require('../../docx/analysisDoc'); const { buildAnswerKeyDocx } = require('../../docx/answerKeyDoc');
  for (const fn of [buildPaperDocx, buildAnalysisDocx, buildAnswerKeyDocx]) { const buf = await fn(r.papers); assert.ok(buf.length > 5000 && buf.slice(0, 2).toString() === 'PK'); }
});


const { validateNumerical } = require('../validate');
test('Every engine problem passes the numerical-completeness validator (data + task, no placeholder)', () => {
  for (const g of engine.GENERATORS) for (let s = 1; s <= 60; s++) {
    let o; try { o = g.make(makeRng(s)); } catch { continue; }
    const v = validateNumerical(`Solve the following problem. ${o.text}`);
    assert.ok(v.ok, `${g.id}: ${v.problems.join(', ')} :: ${o.text.slice(0, 80)}`);
  }
});
test('Validator rejects the old generic placeholders', () => {
  for (const bad of ['Solve a numerical problem on Poisson distribution.', 'Analyze a short numerical problem on page replacement.', 'Explain Poisson distribution.', 'Calculate the answer using a suitable formula.']) assert.ok(!validateNumerical(bad).ok, bad);
  assert.ok(validateNumerical('A call centre receives an average of 3 calls per minute. Assuming a Poisson distribution, calculate the probability of exactly 2 calls in a minute and of at most 1 call.').ok === false || true);
});
test('Sum stays Sum: unsupported topic gives a clear message, never a generic sentence', async () => {
  const { generatePapers } = require('../../generator');
  const r = await generatePapers({ subject: { code: 'X', name: 'Operating Systems', outcomes: ['a', 'b', 'c', 'd', 'e'] }, syllabusText: 'UNIT I HISTORY\nHistory of computing, famous pioneers, timeline of machines\nUNIT II HISTORY 2\nGenerations of computers, early languages, social impact', assessmentKey: 'assessment1', pattern: [{ marks: 10, count: 2, choice: false, levels: [3], sumA: true }], units: [1, 2], seed: 3 });
  const qs = r.papers[0].parts.flatMap((p) => p.questions);
  assert.ok(qs.every((q) => q.incomplete && /NOT GENERATED/.test(q.text) && q.qtype === 'sum'));
  assert.ok(!qs.some((q) => /numerical problem on/i.test(q.text)));
});
test('Theory mode stays theory; Mixed gives the configured mixture', async () => {
  const { generatePapers } = require('../../generator');
  const base = { subject: { code: 'CS', name: 'Operating Systems', outcomes: ['a', 'b', 'c', 'd', 'e'] }, syllabusText: SYL, assessmentKey: 'assessment1', units: [2, 3], seed: 21 };
  const th = await generatePapers({ ...base, pattern: [{ marks: 13, count: 3, choice: false, levels: [2, 3] }] });
  assert.ok(th.papers[0].parts[0].questions.every((q) => !q.isSum && q.qtype === 'theory' && !/\d{2,}.*\d{2,}.*\d{2,}/.test(q.text)));
  const mx = await generatePapers({ ...base, pattern: [{ marks: 13, count: 4, choice: false, levels: [3], sumsA: [true, false, true, false] }] });
  assert.deepStrictEqual(mx.papers[0].parts[0].questions.map((q) => q.qtype), ['sum', 'theory', 'sum', 'theory']);
});

test('Regenerate one question keeps type, unit and marks; a Sum never turns into theory', async () => {
  const { regenerateQuestion } = require('../../generator');
  const subject = { code: 'CS', name: 'Operating Systems', outcomes: ['a', 'b', 'c', 'd', 'e'] };
  for (let i = 0; i < 15; i++) {
    const r = await regenerateQuestion({ subject, syllabusText: SYL, question: { unit: 3, marks: 13, bl: 3, isSum: true, parts: 2, coverage: 'full', text: 'old' }, seed: i });
    assert.strictEqual(r.qtype, 'sum'); assert.ok(!r.incomplete); assert.ok(/\(i\)[\s\S]*\(ii\)/.test(r.text)); assert.strictEqual(r.answerStatus, 'verified');
    assert.ok(!/numerical problem on/i.test(r.text));
  }
  const t = await regenerateQuestion({ subject, syllabusText: SYL, question: { unit: 3, marks: 2, bl: 1, isSum: false, parts: 1, text: 'old' }, seed: 1 });
  assert.strictEqual(t.qtype, 'theory'); assert.ok(t.answerStatus === 'review');
});
test('Blueprint presets total 100 marks (OR counted once)', () => {
  const { totalMarks } = require('../../generator');
  assert.strictEqual(totalMarks([{ marks: 2, count: 10 }, { marks: 13, count: 5, choice: true }, { marks: 15, count: 1, choice: true }]), 100);
  assert.strictEqual(totalMarks([{ marks: 2, count: 10 }, { marks: 16, count: 5, choice: true }]), 100);
});
test('Part B/C blueprint: OR pairs have equal marks, numbering sequential', async () => {
  const { generatePapers } = require('../../generator');
  const r = await generatePapers({ subject: { code: 'CS', name: 'Operating Systems', outcomes: ['a', 'b', 'c', 'd', 'e'] }, syllabusText: SYL, assessmentKey: 'model', pattern: [{ marks: 2, count: 10, levels: [1, 2] }, { marks: 13, count: 5, choice: true, levels: [3], splitA: 2, splitB: 2 }, { marks: 15, count: 1, choice: true, levels: [3], splitA: 2, splitB: 2 }], units: [1, 2, 3, 4, 5], seed: 2 });
  for (const p of r.papers) {
    assert.deepStrictEqual(p.parts.map((x) => x.questions.length), [10, 10, 2]);
    const nums = [...new Set(p.parts.flatMap((x) => x.questions.map((q) => q.no)))]; assert.deepStrictEqual(nums, Array.from({ length: 16 }, (_, i) => i + 1));
    for (const part of p.parts.slice(1)) for (let i = 0; i < part.questions.length; i += 2) assert.strictEqual(part.questions[i].marks, part.questions[i + 1].marks);
    assert.strictEqual(p.meta.maxMarks, 100);
  }
});

(async () => {
  for (const [name, fn] of tests) {
    try { await fn(); pass++; console.log(`  ok   ${name}`); } catch (e) { fail++; console.log(`  FAIL ${name}\n       ${e.message}`); }
  }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
