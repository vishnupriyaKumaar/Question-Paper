import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api.js';
import GuideModal from './GuideModal.jsx';
import Step from './Step.jsx';
import ManageSubjects from './ManageSubjects.jsx';
import SyllabusStep from './SyllabusStep.jsx';
import AssessStep from './AssessStep.jsx';
import BankStep from './BankStep.jsx';
import QuestionsStep from './QuestionsStep.jsx';
import PaperStep from './PaperStep.jsx';

const STEPS = [
  { id: 's-subject', label: 'Subject' },
  { id: 's-syllabus', label: 'Syllabus' },
  { id: 's-assess', label: 'Assessment' },
  { id: 's-bank', label: 'Previous Qs' },
  { id: 's-pattern', label: 'Questions' },
  { id: 's-paper', label: 'Paper' },
];

const clonePattern = (p) => p.map((r) => ({ coverage: 'full', coverageB: 'full', splitA: 1, splitB: 1, sumA: false, sumB: false, splitsA: Array(Number(r.count) || 0).fill(1), splitsB: Array(Number(r.count) || 0).fill(1), sumsA: Array(Number(r.count) || 0).fill(false), sumsB: Array(Number(r.count) || 0).fill(false), ...r, levels: [...r.levels] }));

export default function Workspace({ onLogout, canInstall, onInstall, installed }) {
  const [meta, setMeta] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [subjectId, setSubjectId] = useState('');
  const [syl, setSyl] = useState(null);
  const [bank, setBank] = useState(null);
  const [bankPercent, setBankPercent] = useState(30);
  const [sumSource, setSumSource] = useState('own');
  const [varyNumbers, setVaryNumbers] = useState(false);
  const [assessment, setAssessment] = useState('');
  const [pattern, setPattern] = useState([]);
  const [units, setUnits] = useState([]);
  const [fields, setFields] = useState({ date: '', time: '', academicYear: '', yearSem: '', department: '' });
  const [result, setResult] = useState(null);
  const [gen, setGen] = useState(0);
  const [guideOpen, setGuideOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [manage, setManage] = useState(false);
  const [toast, setToast] = useState(null);
  const [active, setActive] = useState(0);
  const [loadError, setLoadError] = useState('');
  const toastTimer = useRef(0);

  const notify = useCallback((message, isError = false) => {
    setToast({ message, isError });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), isError ? 7000 : 3500);
  }, []);

  const subject = useMemo(() => subjects.find((s) => s.id === subjectId) || null, [subjects, subjectId]);
  const def = useMemo(() => meta?.assessments.find((a) => a.key === assessment) || null, [meta, assessment]);

  // initial load
  useEffect(() => {
    Promise.all([api.meta(), api.subjects()])
      .then(([m, s]) => {
        setMeta(m);
        setSubjects(s);
        setFields((f) => ({ ...f, ...m.defaultMeta }));
      })
      .catch((e) => setLoadError(e.message));
  }, []);

  // subject changed -> reset everything below it
  useEffect(() => {
    setSyl(null);
    setBank(null);
    setAssessment('');
    setResult(null);
    if (!subjectId) return;
    let live = true;
    api.syllabus(subjectId).then((i) => live && setSyl(i)).catch((e) => live && notify(e.message, true));
    api.bank(subjectId).then((i) => live && setBank(i)).catch(() => live && setBank({ uploaded: false }));
    return () => { live = false; };
  }, [subjectId, notify]);

  // syllabus removed -> everything generated from it is stale
  useEffect(() => {
    if (syl && !syl.uploaded) { setAssessment(''); setResult(null); }
  }, [syl]);

  const refreshSubjects = useCallback(async (selectId, removedId) => {
    const list = await api.subjects();
    setSubjects(list);
    if (removedId && removedId === subjectId) setSubjectId('');
    else if (selectId) setSubjectId((cur) => cur || selectId);
    // a syllabus status badge could have changed
  }, [subjectId]);

  function chooseAssessment(key) {
    const a = meta.assessments.find((x) => x.key === key);
    const saved = subject?.patterns?.[key];
    setAssessment(key);
    setPattern(clonePattern(saved && saved.length ? saved : a.pattern));
    const available = (syl?.units || []).map((u) => u.n);
    const wanted = a.units.filter((u) => available.includes(u));
    setUnits(wanted.length ? wanted : available.slice(0, 2));
    setFields((f) => ({ ...f, time: a.time }));
    setResult(null);
    setTimeout(() => document.getElementById('s-pattern')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  }

  function resetPattern() {
    setPattern(clonePattern(def.pattern));
  }

  async function generate() {
    setBusy(true);
    try {
      const avoidTexts = result ? result.papers.flatMap((p) => p.parts.flatMap((pt) => pt.questions.map((q) => q.text))) : [];
      const data = await api.generate({ subjectId, assessment, pattern, units, meta: fields, avoidTexts, bankPercent: bank?.uploaded ? bankPercent : 0, sumSource, varyNumbers });
      setResult(data);
      setGen((g) => g + 1);
      notify(result ? 'New questions generated — different from the previous set.' : `Generated ${def.label}: Set A and Set B.`);
      setTimeout(() => document.getElementById('s-paper')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
      // keep the saved pattern in the local subject list
      setSubjects((list) => list.map((s) => (s.id === subjectId ? { ...s, patterns: { ...(s.patterns || {}), [assessment]: pattern } } : s)));
    } catch (err) {
      notify(err.message, true);
    } finally {
      setBusy(false);
    }
  }

  // highlight the step currently in view
  useEffect(() => {
    if (!meta) return undefined;
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(STEPS.findIndex((s) => s.id === e.target.id))),
      { rootMargin: '-35% 0px -55% 0px' }
    );
    STEPS.forEach((s) => { const el = document.getElementById(s.id); if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, [meta, subjectId, syl, assessment, result]);

  const go = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  if (loadError) return <main className="center-msg"><p className="error" role="alert">{loadError}</p><button className="primary" onClick={onLogout}>Back to sign in</button></main>;
  if (!meta) return <main className="center-msg"><p>Loading…</p></main>;

  const hasSyl = Boolean(syl?.uploaded);

  return (
    <>
      <header className="topbar">
        <div className="brand">
          <img src="/brand/crest.png" alt="" width="30" height="30" />
          <span>Question Paper Generator</span>
        </div>
        <nav aria-label="Steps">
          {STEPS.map((s, i) => (
            <button key={s.id} className={`nav-step${active === i ? ' on' : ''}`} onClick={() => go(s.id)} aria-current={active === i ? 'step' : undefined}>
              <span>{i + 1}</span> {s.label}
            </button>
          ))}
        </nav>
        {canInstall && <button className="install-btn" onClick={onInstall}>Install app</button>}
        <button className="gear-btn" onClick={() => setGuideOpen(true)} title="Guidelines and settings" aria-label="Open guidelines and settings">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3.2" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>
        </button>
        <button className="ghost" onClick={onLogout}>Sign out</button>
        <div className="progress" aria-hidden="true" />
      </header>

      <GuideModal open={guideOpen} onClose={() => setGuideOpen(false)} canInstall={canInstall} onInstall={onInstall} installed={installed} />

      <main className="page">
        <section className="hero">
          <div className="hero-copy">
            <h1>Question papers, written from your syllabus.</h1>
            <p className="hero-sub">Every question follows Bloom’s Taxonomy, with CO, PO and K-level filled in. Download editable Word files for Set A and Set B.</p>
            <button className="primary" onClick={() => go('s-subject')}>Start with a subject</button>
          </div>
        </section>

        <div className="steps">
          <Step n={1} id="s-subject" active={active===0} title="Choose the subject" hint="Pick the course to set a paper for, or manage the list." done={Boolean(subject)}>
            <div className="subject-row">
              <div className="grow">
                <label htmlFor="subject">Subject</label>
                <select id="subject" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
                  <option value="">Select a subject…</option>
                  {subjects.map((s) => <option key={s.id} value={s.id}>{s.code} – {s.name}</option>)}
                </select>
              </div>
              <button className="ghost" onClick={() => setManage(true)}>Manage subjects</button>
            </div>
            {subject && (
              <details className="outcomes">
                <summary>{(subject.outcomes || []).length} course outcomes · Regulation {subject.regulation || '–'}</summary>
                <ol>{(subject.outcomes || []).map((o, i) => <li key={i}><strong>CO{i + 1}</strong> {o}</li>)}</ol>
              </details>
            )}
          </Step>

          <Step n={2} id="s-syllabus" active={active===1} title="Syllabus" hint="Staff upload the syllabus once. Questions are written from it." locked={!subject} lockedNote="Choose a subject to upload its syllabus." done={hasSyl}>
            {subject && <SyllabusStep key={subject.id} subject={subject} syl={syl} setSyl={setSyl} notify={notify} />}
          </Step>

          <Step n={3} id="s-assess" active={active===2} title="Choose the assessment" hint="Each one has its own paper format and syllabus units." locked={!hasSyl} lockedNote="Upload the syllabus to choose an assessment." done={Boolean(assessment)}>
            <AssessStep assessments={meta.assessments} value={assessment} onChange={chooseAssessment} syl={syl} />
          </Step>

          <Step n={4} id="s-bank" active={active===3} title="Previous / model question paper" hint="Optional. Upload an old or model question paper, or important questions, to reuse a share of them." locked={!subject} lockedNote="Choose a subject first." done={Boolean(bank?.uploaded)}>
            {subject && <BankStep key={subject.id} subject={subject} bank={bank} setBank={setBank} notify={notify} />}
          </Step>

          <Step n={5} id="s-pattern" active={active===4} title="Set the marks and questions" hint="Marks × questions = total. Add or delete parts to match your paper." locked={!assessment} lockedNote="Choose Assessment 1, Assessment 2 or Model Test first." done={Boolean(result)}>
            {def && (
              <QuestionsStep sumSource={sumSource} setSumSource={setSumSource} varyNumbers={varyNumbers} setVaryNumbers={setVaryNumbers} bankSlot={subject && <BankStep key={subject.id} idp="bankq" subject={subject} bank={bank} setBank={setBank} notify={notify} />} bank={bank} bankPercent={bankPercent} setBankPercent={setBankPercent} def={def} levels={meta.levels} syl={syl} pattern={pattern} setPattern={setPattern} units={units} setUnits={setUnits}
                coverages={meta.coverages} fields={fields} setFields={setFields} onGenerate={generate} busy={busy} onReset={resetPattern} />
            )}
          </Step>

          <Step n={6} id="s-paper" active={active===5} title="Review and download" hint="Edit any question, then download editable Word files." locked={!result} lockedNote="Generate a paper to review it here.">
            {result && subject && def && (
              <PaperStep key={gen} result={result} setResult={setResult} levels={meta.levels} coverages={meta.coverages} programOutcomes={meta.programOutcomes} subject={subject} def={def} onRegenerate={generate} busy={busy} notify={notify} />
            )}
          </Step>
        </div>

        <footer className="foot">
          <p>Storage: {meta.store === 'firebase-firestore' ? 'Firebase Firestore' : 'local file (testing only)'} · Questions: {meta.aiAvailable ? 'AI-written from syllabus' : 'Bloom’s templates'}</p>
        </footer>
      </main>

      {manage && <ManageSubjects subjects={subjects} onClose={() => setManage(false)} onChanged={refreshSubjects} notify={notify} />}
      <div className={`toast${toast ? ' show' : ''}${toast?.isError ? ' err' : ''}`} role="status" aria-live="polite">{toast?.message}</div>
    </>
  );
}
