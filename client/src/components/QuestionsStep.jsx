// Mark pattern builder: Marks × Questions = Total, with add / delete rows.
export default function QuestionsStep({ bankSlot, sumSource, setSumSource, varyNumbers, setVaryNumbers, bank, bankPercent, setBankPercent, def, levels, coverages, syl, pattern, setPattern, units, setUnits, fields, setFields, onGenerate, busy, onReset }) {
  const maxMarks = pattern.reduce((t, r) => t + (Number(r.marks) || 0) * (Number(r.count) || 0), 0);
  const partLetter = (i) => 'ABCDEFGH'[i] || i + 1;

  // per-question choices: question q of a part; falls back to the part-wide value
  const arr = (r, key, def) => Array.from({ length: Number(r.count) || 0 }, (_, q) => (r[key] && r[key][q] !== undefined ? r[key][q] : def));
  const setQ = (i, key, q, value, def) => { const r = pattern[i]; const a = arr(r, key, def); a[q] = value; patch(i, { [key]: a }); };
  const setAll = (i, key, value, scalar) => patch(i, { [key]: Array.from({ length: Number(pattern[i].count) || 0 }, () => value), [scalar]: value });
  const qBase = (i) => pattern.slice(0, i).reduce((t, r) => t + (Number(r.count) || 0), 0);
  const patch = (i, p) => setPattern(pattern.map((r, idx) => (idx === i ? { ...r, ...p } : r)));
  const remove = (i) => setPattern(pattern.filter((_, idx) => idx !== i));
  const add = () => setPattern([...pattern, { marks: 2, count: 1, choice: false, coverage: 'full', coverageB: 'full', splitA: 1, splitB: 1, sumA: false, sumB: false, levels: [1, 2] }]);
  const allSums = pattern.length > 0 && pattern.every((r) => arr(r, 'sumsA', r.sumA).every(Boolean) && (!r.choice || arr(r, 'sumsB', r.sumB).every(Boolean)));
  const setAllSums = (on) => setPattern(pattern.map((r) => ({ ...r, sumA: on, sumB: on, sumsA: arr(r, 'sumsA', on).map(() => on), sumsB: arr(r, 'sumsB', on).map(() => on) })));
  const toggleLevel = (i, k) => {
    const cur = pattern[i].levels;
    const next = cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k].sort();
    patch(i, { levels: next.length ? next : cur });
  };
  const toggleUnit = (n) => setUnits(units.includes(n) ? (units.length > 1 ? units.filter((u) => u !== n) : units) : [...units, n].sort((a, b) => a - b));
  const setF = (k) => (e) => setFields((f) => ({ ...f, [k]: e.target.value }));
  const valid = pattern.length > 0 && pattern.every((r) => r.marks > 0 && r.count > 0) && units.length > 0;

  return (
    <div>
      <fieldset className="units">
        <legend>Units to cover</legend>
        <div className="chips">
          {(syl?.units || []).map((u) => (
            <button key={u.n} type="button" className={`chip${units.includes(u.n) ? ' on' : ''}`} aria-pressed={units.includes(u.n)} onClick={() => toggleUnit(u.n)} title={u.title}>
              Unit {u.n}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="pattern" role="table" aria-label="Mark pattern">
        <div className="pattern-head" role="row">
          <span>Part</span><span>Marks</span><span aria-hidden="true" /><span>Questions</span><span aria-hidden="true" /><span>Total</span><span>Either / Or</span><span>Bloom’s levels</span><span />
        </div>
        {pattern.map((r, i) => (
          <div className={`pattern-row pc-${i % 6}`} role="row" key={i}>
            <span className="part-tag">Part {partLetter(i)}</span>
            <input aria-label={`Part ${partLetter(i)} marks per question`} type="number" min="1" max="100" value={r.marks} onChange={(e) => patch(i, { marks: e.target.value === '' ? '' : Number(e.target.value) })} />
            <span className="op" aria-hidden="true">×</span>
            <input aria-label={`Part ${partLetter(i)} number of questions`} type="number" min="1" max="30" value={r.count} onChange={(e) => patch(i, { count: e.target.value === '' ? '' : Number(e.target.value) })} />
            <span className="op" aria-hidden="true">=</span>
            <strong className="total">{(Number(r.marks) || 0) * (Number(r.count) || 0)}</strong>
            <label className="switch">
              <input type="checkbox" checked={r.choice} onChange={(e) => patch(i, { choice: e.target.checked })} />
              <span>{r.choice ? 'a / b' : 'Single'}</span>
            </label>
            <div className="chips tight">
              {[1, 2, 3, 4, 5, 6].map((k) => (
                <button key={k} type="button" className={`chip sm${r.levels.includes(k) ? ' on' : ''}`} aria-pressed={r.levels.includes(k)} title={`K${k} ${levels[k]?.name || ''}`} onClick={() => toggleLevel(i, k)}>K{k}</button>
              ))}
            </div>
            <button type="button" className="ghost icon" aria-label={`Delete Part ${partLetter(i)}`} onClick={() => remove(i)}>Delete</button>
            <div className="opts">
              {(r.choice ? ['a', 'b'] : ['']).map((sub) => {
                const B = sub === 'b';
                const covKey = B ? 'coverageB' : 'coverage';
                const splitKey = B ? 'splitsB' : 'splitsA';
                const sumKey = B ? 'sumsB' : 'sumsA';
                const splitDef = B ? r.splitB || 1 : r.splitA || 1;
                const sumDef = Boolean(B ? r.sumB : r.sumA);
                const maxSplit = Math.min(6, Number(r.marks) || 1);
                const splits = arr(r, splitKey, splitDef);
                const sums = arr(r, sumKey, sumDef);
                const base = qBase(i);
                return (
                  <div className={`opt${sums.some(Boolean) ? ' is-sum' : ''}`} key={sub || 'one'}>
                    <p className="opt-title">{r.choice ? `Option ${sub}` : 'Every question in this part'}</p>
                    <label className="opt-field">Syllabus part
                      <select value={r[covKey]} onChange={(e) => patch(i, r.choice ? { [covKey]: e.target.value } : { coverage: e.target.value, coverageB: e.target.value })}>
                        {Object.entries(coverages).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </label>
                    <div className="qgrid" role="group" aria-label={`Split up and sum for each question in Part ${partLetter(i)}${sub ? ` option ${sub}` : ''}`}>
                      {splits.map((n, q) => (
                        <div className={`qcard${sums[q] ? ' sum' : ''}`} key={q}>
                          <b className="qn">{base + q + 1}{sub}</b>
                          <select aria-label={`Split up question ${base + q + 1}${sub}`} value={Math.min(n, maxSplit)} onChange={(e) => setQ(i, splitKey, q, Number(e.target.value), splitDef)}>
                            <option value={1}>No split</option>
                            {[2, 3, 4, 5, 6].filter((x) => x <= maxSplit).map((x) => <option key={x} value={x}>{['i', 'ii', 'iii', 'iv', 'v', 'vi'].slice(0, x).join(', ')} ({x})</option>)}
                          </select>
                          <label className="qsum"><input type="checkbox" aria-label={`Sum for question ${base + q + 1}${sub}`} checked={Boolean(sums[q])} onChange={(e) => setQ(i, sumKey, q, e.target.checked, sumDef)} /><span>Sum</span></label>
                        </div>
                      ))}
                    </div>
                    <div className="qall">
                      <span>Same for all:</span>
                      <select aria-label="Split up for all" value="" onChange={(e) => e.target.value && setAll(i, splitKey, Number(e.target.value), B ? 'splitB' : 'splitA')}>
                        <option value="">Split up…</option>
                        <option value={1}>No split</option>
                        {[2, 3, 4, 5, 6].filter((x) => x <= maxSplit).map((x) => <option key={x} value={x}>{x} parts</option>)}
                      </select>
                      <button type="button" className="ghost sm" onClick={() => setAll(i, sumKey, !sums.every(Boolean), B ? 'sumB' : 'sumA')}>{sums.every(Boolean) ? 'No sums' : 'All sums'}</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        {pattern.length === 0 && <p className="muted pad">No parts yet. Add a row to start.</p>}
      </div>

      <div className="sumbar">
        <span>Subjects like Maths need sums only:</span>
        <button type="button" className="ghost" onClick={() => setAllSums(!allSums)}>{allSums ? 'Clear all sums' : 'Make every question a sum'}</button>
        <small>Tick “Sum” on any question above. Sum questions are Applying (K3) or higher.</small>
        <fieldset className="src-pick">
          <legend>Where should the problems come from?</legend>
          <label className={sumSource === 'own' ? 'on' : ''}><input type="radio" name="sumsrc" checked={sumSource === 'own'} onChange={() => setSumSource('own')} /><span><b>Set by the app</b><small>Numerical problems with computed answers from the built-in generators (OS, Maths, Statistics, EDA, Cryptography, DBMS, Networks, Programming…). No API key needed</small></span></label>
          <label className={sumSource === 'bank' ? 'on' : ''}><input type="radio" name="sumsrc" checked={sumSource === 'bank'} onChange={() => setSumSource('bank')} /><span><b>Previous year question paper</b><small>Takes the sums from the paper you upload below</small></span></label>
          <label className={sumSource === 'google' ? 'on' : ''}><input type="radio" name="sumsrc" checked={sumSource === 'google'} onChange={() => setSumSource('google')} /><span><b>From Google (web search)</b><small>Searches online for problems like the ones in your uploaded paper and rewrites them in that style (needs an Anthropic API key)</small></span></label>
          {sumSource === 'bank' && <label className="vary"><input type="checkbox" checked={!!varyNumbers} onChange={(e) => setVaryNumbers(e.target.checked)} /><span><b>Change the numbers a little</b><small>So the sums are not identical to the old paper. Solve each once to check (these are marked in the paper).</small></span></label>}
        </fieldset>
      </div>

      <div className="pattern-foot">
        <button type="button" className="ghost" onClick={add}>Add part</button>
        <button type="button" className="ghost" onClick={onReset}>Reset to {def.label} default</button>
        <button type="button" className="ghost" title="Part A 10 × 2 = 20; Part B Q11–15 with OR, 13 marks each = 65; Part C Q16 with OR, 15 marks = 15; total 100" onClick={() => setPattern([{ marks: 2, count: 10, choice: false, levels: [1, 2] }, { marks: 13, count: 5, choice: true, levels: [2, 3], splitA: 2, splitB: 2 }, { marks: 15, count: 1, choice: true, levels: [3, 4], splitA: 2, splitB: 2 }])}>Blueprint: GRT model paper (100)</button>
        <button type="button" className="ghost" title="Part A 10 × 2 = 20; Part B 5 × 16 with OR and (i)/(ii) parts = 80; total 100" onClick={() => setPattern([{ marks: 2, count: 10, choice: false, levels: [1, 2] }, { marks: 16, count: 5, choice: true, levels: [2, 3, 4], splitA: 2, splitB: 2 }])}>Blueprint: 10×2 + 5×16 (100)</button>
        <p className="grand">Maximum marks <strong>{maxMarks}</strong></p>
      </div>

      <div className={`bankbox${bank?.uploaded ? ' on' : ''}`}>
        <h3>Previous year / model question paper</h3>
        <p className="muted small">Upload an old question paper here (or in step 4). Choose how much of this paper to take from it.</p>
        {bankSlot}
        {bank?.uploaded && (
          <label className="pct" htmlFor="bank-pct">
            <span>Take <strong>{bankPercent}%</strong> of the normal (non-sum) questions from the uploaded paper</span>
            <input id="bank-pct" type="range" min="0" max="100" step="5" value={bankPercent} onChange={(e) => setBankPercent(Number(e.target.value))} />
            <span className="pct-scale"><i>0% all new</i><i>100% all uploaded</i></span>
          </label>
        )}
        {bank?.uploaded && <p className="muted small">The rest are generated from the syllabus. Sums follow the choice above. Uploaded questions go to the matching unit and Bloom level and are never repeated between Set A and Set B.</p>}
      </div>

      <details className="paper-fields">
        <summary>Paper details (date, year, time)</summary>
        <div className="field-grid">
          <div><label htmlFor="f-date">Date</label><input id="f-date" value={fields.date} onChange={setF('date')} placeholder="DD.MM.YYYY" /></div>
          <div><label htmlFor="f-time">Time</label><input id="f-time" value={fields.time} onChange={setF('time')} /></div>
          <div className="wide"><label htmlFor="f-ay">Academic year</label><input id="f-ay" value={fields.academicYear} onChange={setF('academicYear')} /></div>
          <div><label htmlFor="f-ys">Year / semester</label><input id="f-ys" value={fields.yearSem} onChange={setF('yearSem')} /></div>
          <div className="wide"><label htmlFor="f-dp">Department</label><input id="f-dp" value={fields.department} onChange={setF('department')} /></div>
        </div>
      </details>

      <button className="primary big" onClick={onGenerate} disabled={busy || !valid}>
        {busy ? 'Generating Set A and Set B…' : `Generate ${def.label} question paper (Set A and Set B)`}
      </button>
    </div>
  );
}
