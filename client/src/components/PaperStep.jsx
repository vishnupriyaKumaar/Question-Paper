import { useMemo, useRef, useEffect, useState } from 'react';
import { api, saveBlob } from '../api.js';
import { startsWithVerb } from '../bloom.js';

function AutoText({ value, onChange, label }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (el) { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; }
  }, [value]);
  return <textarea ref={ref} rows={1} aria-label={label} value={value} onChange={onChange} />;
}

export default function PaperStep({ result, setResult, levels, coverages, programOutcomes, subject, def, onRegenerate, busy, notify }) {
  const [tab, setTab] = useState(0);
  const [dl, setDl] = useState('');
  const view = tab >= 2 ? 'k' : 'paper';
  const pIdx = tab % 2;
  const paper = result.papers[pIdx];
  const coCount = Math.max(5, (subject.outcomes || []).length);

  function update(partIdx, qIdx, patchObj) {
    setResult((r) => ({
      ...r,
      papers: r.papers.map((p, pi) =>
        pi !== pIdx ? p : { ...p, parts: p.parts.map((part, i) => (i !== partIdx ? part : { ...part, questions: part.questions.map((q, j) => (j !== qIdx ? q : { ...q, ...patchObj })) })) }
      ),
    }));
  }

  const dist = useMemo(() => {
    const d = [0, 0, 0, 0, 0, 0];
    paper.parts.forEach((p) => p.questions.forEach((q) => { d[q.bl - 1] += 1; }));
    return d;
  }, [paper]);
  const totalQ = dist.reduce((a, b) => a + b, 0) || 1;
  const kdata = useMemo(() => {
    const by = [1, 2, 3, 4, 5, 6].map(() => ({ n: 0, marks: 0 }));
    const co = {};
    const po = {};
    let total = 0;
    paper.parts.forEach((p) => p.questions.forEach((q) => {
      const m = Number(q.marks) || 0;
      by[q.bl - 1].n += 1; by[q.bl - 1].marks += m; total += m;
      (co[q.co] = co[q.co] || { n: 0, marks: 0 }).n += 1; co[q.co].marks += m;
      (po[q.po] = po[q.po] || { n: 0, marks: 0 }).n += 1; po[q.po].marks += m;
    }));
    return { by, co, po, total };
  }, [paper]);

  const base = `${subject.code}_${def.label.replace(/\s+/g, '')}`;
  async function download(kind) {
    setDl(kind);
    try {
      if (kind === 'analysis') saveBlob(await api.exportAnalysis(result.papers), `${base}_K-Level-Analysis.docx`);
      else if (kind === 'kA' || kind === 'kB') saveBlob(await api.exportAnalysis([result.papers[kind === 'kA' ? 0 : 1]]), `${base}_Set${kind[1]}_K-Values.docx`);
      else if (kind === 'answers') saveBlob(await api.exportAnswers(result.papers), `${base}_Answer-Key.docx`);
      else if (kind === 'both') saveBlob(await api.exportPaper(result.papers), `${base}_SetA_SetB.docx`);
      else {
        const i = kind === 'A' ? 0 : 1;
        saveBlob(await api.exportPaper([result.papers[i]]), `${base}_Set${kind}.docx`);
      }
      notify('Word file downloaded.');
    } catch (err) {
      notify(err.message, true);
    } finally {
      setDl('');
    }
  }

  const [busyQ, setBusyQ] = useState('');
  async function regen(pi, qi, q) {
    setBusyQ(q.id);
    try {
      const avoid = result.papers.flatMap((p) => p.parts.flatMap((pt) => pt.questions.map((x) => x.text)));
      const r = await api.regenerateQuestion(subject.id, q, avoid);
      update(pi, qi, r);
      notify(r.incomplete ? 'No numerical problem could be generated for this unit.' : 'Question regenerated. Other questions were not changed.', Boolean(r.incomplete));
    } catch (err) { notify(err.message, true); } finally { setBusyQ(''); }
  }
  const incompleteCount = paper.parts.flatMap((p) => p.questions).filter((q) => q.incomplete).length;
  const flagged = paper.parts.flatMap((p) => p.questions).filter((q) => !startsWithVerb(q.text, q.bl, levels)).length;

  return (
    <div>
      {result.warnings?.map((w, i) => <p className="warn" key={i}>{w}</p>)}
      {!result.aiUsed && (
        <p className="note">Questions were built from your syllabus topics using Bloom’s verb templates. Edit any question below before downloading. Add an Anthropic API key to the server to have fuller, syllabus-specific questions written.</p>
      )}

      <div className="tabs" role="tablist" aria-label="Question paper set">
        {result.papers.map((p, i) => (
          <button key={p.meta.set} role="tab" aria-selected={tab === i} className={`tab${tab === i ? ' on' : ''}`} onClick={() => setTab(i)}>Set {p.meta.set}</button>
        ))}
        {result.papers.map((p, i) => (
          <button key={`k${p.meta.set}`} role="tab" aria-selected={tab === i + 2} className={`tab ktab${tab === i + 2 ? ' on' : ''}`} onClick={() => setTab(i + 2)}>Set {p.meta.set} K-Values</button>
        ))}
        <button className="ghost regen" onClick={onRegenerate} disabled={busy}>{busy ? 'Generating…' : 'Generate again'}</button>
      </div>

      {view === 'k' && (
        <section className="kview" aria-label={`Set ${paper.meta.set} K-values`}>
          <h3>Set {paper.meta.set} · K-Values (Bloom’s Taxonomy)</h3>
          <p className="muted">{paper.meta.title} · {paper.meta.subjectCode} {paper.meta.subjectName}. Updates as you edit the questions or change a BL.</p>
          <div className="ktable-wrap">
            <table className="ktable">
              <thead><tr><th>K</th><th>Level</th><th>Questions</th><th>Marks</th><th>% of marks</th><th className="kbar-col">Spread</th></tr></thead>
              <tbody>
                {kdata.by.map((r, i) => (
                  <tr key={i}>
                    <td><span className={`k k${i + 1}`}>K{i + 1}</span></td>
                    <td>{levels[i + 1]?.name}</td>
                    <td>{r.n || '–'}</td>
                    <td>{r.marks || '–'}</td>
                    <td>{kdata.total ? `${((r.marks / kdata.total) * 100).toFixed(1)}%` : '0%'}</td>
                    <td className="kbar-col"><span className="meter"><i className={`k${i + 1}`} style={{ width: `${kdata.total ? (r.marks / kdata.total) * 100 : 0}%` }} /></span></td>
                  </tr>
                ))}
                <tr className="sum"><td /><td>Total</td><td>{dist.reduce((a, b) => a + b, 0)}</td><td>{kdata.total}</td><td>100%</td><td className="kbar-col" /></tr>
              </tbody>
            </table>
          </div>
          <div className="kgrid">
            <div>
              <h4>Course outcomes</h4>
              <ul className="klist">{Object.keys(kdata.co).sort().map((c) => <li key={c}><b>{c}</b><span>{kdata.co[c].n} Q · {kdata.co[c].marks} marks</span></li>)}</ul>
            </div>
            <div>
              <h4>Programme outcomes</h4>
              <ul className="klist">{Object.keys(kdata.po).sort((x, y) => Number(x.slice(2)) - Number(y.slice(2))).map((c) => <li key={c}><b>{c}</b><span>{kdata.po[c].n} Q · {kdata.po[c].marks} marks</span></li>)}</ul>
            </div>
          </div>
          <p className="muted small">Marks count both options of an Either/Or pair, so the total can be more than the maximum marks.</p>
          <div className="downloads">
            <button className="primary" onClick={() => download(`k${paper.meta.set}`)} disabled={!!dl}>{dl === `k${paper.meta.set}` ? 'Preparing…' : `Download Set ${paper.meta.set} K-Values (Word)`}</button>
            <button className="ghost" onClick={() => download('analysis')} disabled={!!dl}>{dl === 'analysis' ? 'Preparing…' : 'Download both sets K-analysis'}</button>
          </div>
        </section>
      )}

      {view === 'paper' && (
        <>
      <article className="sheet" aria-label={`Set ${paper.meta.set} preview`}>
        <header className="sheet-head">
          <p className="sheet-title">{paper.meta.title}</p>
          <p>{paper.meta.subjectCode} – {paper.meta.subjectName}</p>
          <p className="sheet-line"><span>Time: {paper.meta.time}</span><strong>Set {paper.meta.set}</strong><span>Maximum marks: {paper.meta.maxMarks}</span></p>
        </header>

        <div className="q-head" aria-hidden="true"><span>Q.No</span><span>Answer all questions</span><span>CO</span><span>PO</span><span>BL</span></div>

        {paper.parts.map((part, pi) => (
          <div key={part.letter}>
            <p className="part-title">{part.title}</p>
            {part.questions.map((q, qi) => {
              const ok = startsWithVerb(q.text, q.bl, levels);
              return (
                <div key={q.id}>
                  {q.sub === 'b' && <p className="or">OR</p>}
                  <div className="q-row">
                    <span className="qno">{q.no}{q.sub ? ` ${q.sub}` : ''}</span>
                    <div className="q-text">
                      <AutoText label={`Question ${q.no}${q.sub}`} value={q.text} onChange={(e) => update(pi, qi, { text: e.target.value })} />
                      <p className="scope" title={q.topic}>Unit {q.unit} · {coverages[q.coverage || 'full']}{q.parts > 1 ? ` · ${q.parts} parts` : ''}{q.isSum && <span className="src-sum"> · Sum</span>}{q.varied && <span className="src-warn"> · Numbers changed - please check</span>}{q.source === 'engine' && <span className="src-bank"> · Built-in generator (answer computed)</span>}{q.source === 'web' && <span className="src-bank"> · Adapted from web problems</span>}{(q.source === 'bank' || q.source === 'mixed') && <span className="src-bank"> · {q.source === 'bank' ? 'From uploaded questions' : 'Partly from uploaded questions'}</span>}</p>
                      {q.incomplete && <p className="verb bad">This Sum could not be generated (no calculation exists for its topic). Type the problem, regenerate, or change the unit.</p>}
                      <button type="button" className="ghost small" disabled={busyQ === q.id} onClick={() => regen(pi, qi, q)}>{busyQ === q.id ? 'Regenerating…' : `Regenerate this ${q.isSum ? 'Sum' : 'question'} only`}</button>
                      <details className="ans-key">
                        <summary>Answer key <span className={`ans-badge ${q.answerStatus === 'verified' ? 'v' : q.answerStatus === 'edited' ? 'e' : 'r'}`}>{q.answerStatus === 'verified' ? 'Verified by the generator' : q.answerStatus === 'edited' ? 'Edited by you' : 'Needs instructor review'}</span></summary>
                        <AutoText label={`Answer for question ${q.no}${q.sub}`} value={q.answer || ''} onChange={(e) => update(pi, qi, { answer: e.target.value, answerStatus: e.target.value.trim() ? 'edited' : 'review' })} />
                        {!q.answer && <p className="muted">No verified answer exists for this question. Type the marking points here (or leave it and prepare the scheme from the syllabus).</p>}
                      </details>
                      <p className={`verb ${ok ? 'ok' : 'bad'}`}>
                        {ok ? `K${q.bl} ${levels[q.bl]?.name}: starts with a valid verb` : `Does not start with a K${q.bl} ${levels[q.bl]?.name} verb. Change the wording or the BL.`}
                      </p>
                    </div>
                    <select aria-label="Course outcome" value={q.co} onChange={(e) => update(pi, qi, { co: e.target.value })}>
                      {Array.from({ length: coCount }, (_, i) => `CO${i + 1}`).map((c) => <option key={c}>{c}</option>)}
                    </select>
                    <select aria-label="Programme outcome" value={q.po} onChange={(e) => update(pi, qi, { po: e.target.value })}>
                      {programOutcomes.map((o) => <option key={o.code} value={o.code} title={`${o.code}: ${o.name}`}>{o.code}</option>)}
                    </select>
                    <select aria-label="Bloom’s level" value={q.bl} onChange={(e) => update(pi, qi, { bl: Number(e.target.value) })}>
                      {[1, 2, 3, 4, 5, 6].map((k) => <option key={k} value={k}>{k}</option>)}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </article>

      <details className="po-legend">
        <summary>Programme outcomes (PO1–PO12)</summary>
        <ul>
          {programOutcomes.map((o) => (
            <li key={o.code}><strong>{o.code}</strong> <span><b>{o.name}</b> ({o.domain}): {o.text}</span></li>
          ))}
        </ul>
      </details>

      <div className="kbar" aria-label="K-level spread for this set">
        <div className="kbar-track">
          {dist.map((n, i) => n > 0 && <span key={i} className={`k k${i + 1}`} style={{ flexGrow: n }} title={`K${i + 1} ${levels[i + 1].name}: ${n}`}>K{i + 1}</span>)}
        </div>
        <p className="muted">{dist.map((n, i) => `K${i + 1}: ${n}`).join('   ')} {flagged > 0 && <strong className="bad"> · {flagged} to check</strong>}</p>
      </div>

        </>
      )}

      {view === 'paper' && <div className="downloads">
        <button className="primary" onClick={() => download('A')} disabled={!!dl}>{dl === 'A' ? 'Preparing…' : 'Download Set A (Word)'}</button>
        <button className="primary" onClick={() => download('B')} disabled={!!dl}>{dl === 'B' ? 'Preparing…' : 'Download Set B (Word)'}</button>
        <button className="ghost" onClick={() => download('both')} disabled={!!dl}>{dl === 'both' ? 'Preparing…' : 'Download both sets'}</button>
        <button className="ghost" onClick={() => download('analysis')} disabled={!!dl}>{dl === 'analysis' ? 'Preparing…' : 'Download K-level analysis (Word)'}</button>
        <button className="ghost" onClick={() => window.print()}>Print / Save as PDF</button>
        <button className="ghost" onClick={() => download('answers')} disabled={!!dl}>{dl === 'answers' ? 'Preparing…' : 'Download answer key (Word)'}</button>
      </div>}
    </div>
  );
}
