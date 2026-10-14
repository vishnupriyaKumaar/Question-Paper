const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const rateLimit = require('express-rate-limit');

const config = require('./config');
const store = require('./store');
const { login, requireAuth } = require('./auth');
const syllabus = require('./syllabus');
const { ASSESSMENTS } = require('./patterns');
const { LEVELS } = require('./bloom');
const bankLib = require('./bank');
const { regenerateQuestion, generatePapers, cleanPattern, totalMarks, COVERAGE_LABEL } = require('./generator');
const { buildPaperDocx } = require('./docx/paperDoc');
const { buildAnalysisDocx } = require('./docx/analysisDoc');
const { buildAnswerKeyDocx } = require('./docx/answerKeyDoc');
const ai = require('./ai');
const { PROGRAM_OUTCOMES } = require('./outcomes');

const app = express();
app.set('trust proxy', 1);
app.use(cors());
app.use(express.json({ limit: '2mb' }));

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 10 } });
const uploadMulti = upload.fields([{ name: 'file', maxCount: 10 }, { name: 'files', maxCount: 10 }]);
const uploadFiles = (req, res, next) => uploadMulti(req, res, (err) => {
  if (!err) return next();
  const map = { LIMIT_FILE_SIZE: [413, 'A file is bigger than 10 MB. Use a smaller file.'], LIMIT_FILE_COUNT: [400, 'Too many files at once (maximum 10).'], LIMIT_UNEXPECTED_FILE: [400, 'Unexpected upload field.'] };
  const [status, msg] = map[err.code] || [400, `Upload failed: ${err.message || 'the file could not be received'}`];
  return res.status(status).json({ error: msg });
});
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ---------- public ----------
app.get('/api/health', (req, res) => res.json({ ok: true, store: store.name }));

app.post(
  '/api/login',
  rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many attempts. Try again later.' } }),
  (req, res) => {
    const token = login(req.body && req.body.password);
    if (!token) return res.status(401).json({ error: 'Incorrect password.' });
    res.json({ token });
  }
);

// ---------- protected ----------
app.use('/api', requireAuth);

app.get('/api/meta', (req, res) => {
  res.json({
    assessments: Object.values(ASSESSMENTS),
    levels: LEVELS,
    programOutcomes: PROGRAM_OUTCOMES,
    coverages: COVERAGE_LABEL,
    aiAvailable: ai.available(),
    store: store.name,
    defaultMeta: config.defaultMeta,
  });
});

// Project ZIP (source code without secrets) for the in-app guide -----------
const ZIP_NAME = 'GRT-Question-Paper-Generator.zip';
app.get('/api/guide/download', (req, res) => {
  const file = path.join(__dirname, 'assets', 'downloads', ZIP_NAME);
  if (!fs.existsSync(file)) return res.status(404).json({ error: `The project ZIP is not stored in this copy. Put ${ZIP_NAME} in server/assets/downloads/ and redeploy.` });
  res.set({ 'Content-Type': 'application/zip', 'Content-Disposition': `attachment; filename="${ZIP_NAME}"`, 'Content-Length': fs.statSync(file).size });
  fs.createReadStream(file).pipe(res);
});

// Subjects -------------------------------------------------------------
function readSubject(body) {
  const code = String(body.code || '').trim().toUpperCase();
  const name = String(body.name || '').trim();
  if (!code || !name) throw Object.assign(new Error('Subject code and name are required.'), { status: 400 });
  const outcomes = (Array.isArray(body.outcomes) ? body.outcomes : String(body.outcomes || '').split('\n'))
    .map((s) => String(s).replace(/^\s*CO\d+\s*[:.\-–]?\s*/i, '').trim())
    .filter(Boolean)
    .slice(0, 10);
  return { code: code.slice(0, 20), name: name.slice(0, 120), regulation: String(body.regulation || '').trim().slice(0, 10), outcomes };
}

app.get('/api/subjects', wrap(async (req, res) => {
  const subjects = await store.listSubjects();
  const out = await Promise.all(
    subjects.map(async (s) => {
      const syl = await store.getSyllabus(s.id);
      return { ...s, hasSyllabus: Boolean(syl) };
    })
  );
  res.json(out);
}));

app.post('/api/subjects', wrap(async (req, res) => {
  const data = readSubject(req.body || {});
  const existing = await store.listSubjects();
  if (existing.some((s) => s.code === data.code)) return res.status(409).json({ error: `Subject ${data.code} already exists.` });
  res.status(201).json(await store.createSubject(data));
}));

app.put('/api/subjects/:id', wrap(async (req, res) => {
  const data = readSubject(req.body || {});
  const existing = await store.listSubjects();
  if (existing.some((s) => s.code === data.code && s.id !== req.params.id)) return res.status(409).json({ error: `Subject ${data.code} already exists.` });
  const updated = await store.updateSubject(req.params.id, data);
  if (!updated) return res.status(404).json({ error: 'Subject not found.' });
  res.json(updated);
}));

app.delete('/api/subjects/:id', wrap(async (req, res) => {
  await store.deleteSubject(req.params.id);
  res.json({ ok: true });
}));

// Syllabus -------------------------------------------------------------
function syllabusInfo(s) {
  return { uploaded: true, fileName: s.fileName, uploadedAt: s.uploadedAt, ...syllabus.summarize(s.text) };
}

app.get('/api/subjects/:id/syllabus', wrap(async (req, res) => {
  const s = await store.getSyllabus(req.params.id);
  if (!s) return res.json({ uploaded: false });
  res.json(syllabusInfo(s));
}));

const saveSyllabus = wrap(async (req, res) => {
  const subject = await store.getSubject(req.params.id);
  if (!subject) return res.status(404).json({ error: 'Subject not found.' });
  let text = '';
  let fileName = '';
  const report = {};
  const files = [...((req.files && req.files.file) || []), ...((req.files && req.files.files) || [])];
  if (files.length) {
    text = await syllabus.extractText(files, { report });
    fileName = files.map((f) => f.originalname).join(', ').slice(0, 200);
  } else if (req.body && req.body.text) {
    text = syllabus.normalize(req.body.text);
    fileName = 'Pasted text';
  }
  if (text.length < 40) {
    return res.status(400).json({ error: 'Could not read any text from the syllabus. If it is a picture, make sure the text is sharp and upright, or paste the text instead.' });
  }
  if (req.query.append) {
    // extra batch of a multi-file upload: add to what the first batch saved
    const prev = await store.getSyllabus(req.params.id);
    if (prev) {
      text = syllabus.normalize(`${prev.text}\n\n${text}`);
      fileName = `${prev.fileName}, ${fileName}`.slice(0, 200);
    }
  }
  const saved = await store.saveSyllabus(req.params.id, { fileName, text });
  res.json(syllabusInfo(saved));
});
app.post('/api/subjects/:id/syllabus', uploadFiles, saveSyllabus);
app.put('/api/subjects/:id/syllabus', uploadFiles, saveSyllabus);

app.delete('/api/subjects/:id/syllabus', wrap(async (req, res) => {
  await store.deleteSyllabus(req.params.id);
  res.json({ ok: true });
}));

// Previous / important questions ----------------------------------------
function bankInfo(b) {
  return { uploaded: true, fileName: b.fileName, uploadedAt: b.uploadedAt, ...bankLib.summarize(b.text) };
}
app.get('/api/subjects/:id/bank', wrap(async (req, res) => {
  const b = await store.getBank(req.params.id);
  res.json(b ? bankInfo(b) : { uploaded: false });
}));
const saveBank = wrap(async (req, res) => {
  const subject = await store.getSubject(req.params.id);
  if (!subject) return res.status(404).json({ error: 'Subject not found.' });
  let text = '';
  let fileName = '';
  const report = {};
  const files = [...((req.files && req.files.file) || []), ...((req.files && req.files.files) || [])];
  if (files.length) {
    text = await syllabus.extractText(files, { keepTabs: true, report });
    fileName = files.map((f) => f.originalname).join(', ').slice(0, 200);
  } else if (req.body && req.body.text) {
    text = syllabus.normalize(req.body.text, true);
    fileName = 'Pasted text';
  }
  if (text.length < 20 || bankLib.parseQuestions(text).length < 1) {
    return res.status(400).json({ error: 'No questions could be found in that file. Check that it is the question paper (text in pictures must be sharp), or paste the questions instead.' + (report.problems && report.problems.length ? ` (${report.problems.join(' | ')})` : '') });
  }
  if (req.query.append) {
    const prev = await store.getBank(req.params.id);
    if (prev) {
      text = syllabus.normalize(`${prev.text}\n\n${text}`, true);
      fileName = `${prev.fileName}, ${fileName}`.slice(0, 200);
    }
  }
  const saved = await store.saveBank(req.params.id, { fileName, text });
  res.json({ ...bankInfo(saved), skipped: report.problems || [] });
});
app.post('/api/subjects/:id/bank', uploadFiles, saveBank);
app.put('/api/subjects/:id/bank', uploadFiles, saveBank);
app.delete('/api/subjects/:id/bank', wrap(async (req, res) => {
  await store.deleteBank(req.params.id);
  res.json({ ok: true });
}));

// Generate -------------------------------------------------------------
app.post('/api/generate', wrap(async (req, res) => {
  const { subjectId, assessment, pattern, units, meta, avoidTexts, bankPercent, sumSource, varyNumbers, seed } = req.body || {};
  const subject = await store.getSubject(subjectId);
  if (!subject) return res.status(404).json({ error: 'Subject not found.' });
  const syl = await store.getSyllabus(subjectId);
  if (!syl) return res.status(400).json({ error: 'Upload the syllabus for this subject first.' });

  const rows = cleanPattern(pattern);
  if (!rows.length) return res.status(400).json({ error: 'Add at least one mark pattern row (marks × questions).' });
  if (rows.some((r) => r.count > 30)) return res.status(400).json({ error: 'Too many questions in one row (max 30).' });

  const pct = Math.max(0, Math.min(100, Number(bankPercent) || 0));
  const source = ['own', 'bank', 'google'].includes(sumSource) ? sumSource : 'own';
  const bankDoc = await store.getBank(subjectId);
  const result = await generatePapers({ bankText: bankDoc ? bankDoc.text : '', bankPercent: pct, sumSource: source, varyNumbers: Boolean(varyNumbers), seed: seed === undefined || seed === '' ? undefined : Number(seed), subject, syllabusText: syl.text, assessmentKey: assessment, pattern: rows, units, meta: meta || {}, avoidTexts: Array.isArray(avoidTexts) ? avoidTexts.slice(0, 200).map(String) : [] });
  // remember the pattern used for this subject + assessment
  await store.updateSubject(subjectId, { patterns: { ...(subject.patterns || {}), [assessment]: rows } });
  res.json({ ...result, maxMarks: totalMarks(rows) });
}));

app.post('/api/regenerate-question', wrap(async (req, res) => {
  const { subjectId, question, avoidTexts } = req.body || {};
  const subject = await store.getSubject(subjectId);
  if (!subject) return res.status(404).json({ error: 'Subject not found.' });
  const syl = await store.getSyllabus(subjectId);
  if (!syl) return res.status(400).json({ error: 'Upload the syllabus for this subject first.' });
  if (!question || typeof question !== 'object') return res.status(400).json({ error: 'No question supplied.' });
  res.json(await regenerateQuestion({ subject, syllabusText: syl.text, question, avoidTexts: Array.isArray(avoidTexts) ? avoidTexts.slice(0, 200).map(String) : [] }));
}));

// Word exports ---------------------------------------------------------
function readPapers(body) {
  const papers = body && body.papers;
  if (!Array.isArray(papers) || !papers.length || papers.length > 4) throw Object.assign(new Error('No question paper supplied.'), { status: 400 });
  for (const p of papers) {
    if (!p || !p.meta || !Array.isArray(p.parts)) throw Object.assign(new Error('Invalid question paper.'), { status: 400 });
  }
  return papers;
}
const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

app.post('/api/export/paper', wrap(async (req, res) => {
  const buf = await buildPaperDocx(readPapers(req.body));
  res.set({ 'Content-Type': DOCX, 'Content-Length': buf.length });
  res.send(buf);
}));
app.post('/api/export/analysis', wrap(async (req, res) => {
  const buf = await buildAnalysisDocx(readPapers(req.body));
  res.set({ 'Content-Type': DOCX, 'Content-Length': buf.length });
  res.send(buf);
}));

app.post('/api/export/answers', wrap(async (req, res) => {
  const buf = await buildAnswerKeyDocx(readPapers(req.body));
  res.set({ 'Content-Type': DOCX, 'Content-Length': buf.length });
  res.send(buf);
}));

// ---------- front end (built React app) ----------
const dist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^\/(?!api\/).*/, (req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status || (err.code === 'LIMIT_FILE_SIZE' ? 413 : 500);
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 ? `Something went wrong on the server${err && err.message ? ` (${String(err.message).slice(0, 160)})` : ''}.` : err.message });
});

if (require.main === module) {
  app.listen(config.port, () => {
    console.log(`QP Generator running on http://localhost:${config.port}  (store: ${store.name}, AI: ${ai.available() ? 'on' : 'off - template mode'})`);
    if (config.jwtSecretIsRandom) console.log('Note: JWT_SECRET not set - using a temporary secret (logins reset on restart).');
  });
}

module.exports = app;
