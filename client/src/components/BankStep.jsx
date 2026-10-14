import { useRef, useState } from 'react';
import { api } from '../api.js';
import { ACCEPT, MAX_FILE, BATCH, shrink, fmt } from './SyllabusStep.jsx';

// Optional: previous-year / important questions for this subject.
export default function BankStep({ subject, bank, setBank, notify, idp = 'bank' }) {
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [text, setText] = useState('');
  const [confirmDel, setConfirmDel] = useState(false);

  async function upload(picked, replace) {
    if (!picked.length) return;
    setError(''); setBusy(true);
    try {
      const files = await Promise.all(picked.map(shrink));
      const big = files.find((f) => f.size > MAX_FILE);
      if (big) throw new Error(`“${big.name}” is bigger than 10 MB. Use a smaller file.`);
      const batches = [];
      let cur = []; let size = 0;
      for (const f of files) {
        if (cur.length && size + f.size > BATCH) { batches.push(cur); cur = []; size = 0; }
        cur.push(f); size += f.size;
      }
      if (cur.length) batches.push(cur);
      let info;
      for (let i = 0; i < batches.length; i++) info = await api.uploadBank(subject.id, { files: batches[i] }, i === 0 ? replace : true, i > 0);
      setBank(info);
      notify(`${info.count} questions read from the uploaded paper(s).${info.skipped && info.skipped.length ? ` Skipped: ${info.skipped.join('; ')}` : ''}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function savePasted() {
    setError(''); setBusy(true);
    try {
      const info = await api.uploadBank(subject.id, { text }, Boolean(bank?.uploaded), false);
      setBank(info); setText('');
      notify(`${info.count} questions saved.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirmDel) { setConfirmDel(true); return; }
    setBusy(true);
    try {
      await api.deleteBank(subject.id);
      setBank({ uploaded: false }); setConfirmDel(false);
      notify('Uploaded questions deleted.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!bank) return <p className="muted">Checking for uploaded questions…</p>;

  const picker = (id, replace) => (
    <input ref={fileRef} type="file" accept={ACCEPT} multiple hidden id={id} onChange={(e) => upload(Array.from(e.target.files || []), replace)} />
  );

  if (bank.uploaded) {
    return (
      <div>
        <div className="uploaded">
          <div>
            <p className="ok-line"><span className="tick" aria-hidden="true">✓</span> Questions uploaded</p>
            <p className="muted">{bank.fileName} · {fmt(bank.uploadedAt)}</p>
            <p><strong>{bank.count}</strong> questions found, <strong>{bank.sums}</strong> of them sums.</p>
          </div>
          <div className="row-actions">
            {picker(`${idp}-replace`, true)}
            <button className="ghost" onClick={() => fileRef.current?.click()} disabled={busy}>Replace</button>
            <button className={confirmDel ? 'danger' : 'ghost'} onClick={remove} onBlur={() => setConfirmDel(false)} disabled={busy}>{confirmDel ? 'Confirm delete' : 'Delete'}</button>
          </div>
        </div>
        {bank.sample?.length > 0 && (
          <details className="paste">
            <summary>Preview of what was read</summary>
            <ol className="bank-sample">{bank.sample.map((q, i) => <li key={i}>{q}</li>)}</ol>
          </details>
        )}
        <p className="muted small">Set the percentage to use in the next step, “Set the marks and questions”.</p>
        {error && <p className="error" role="alert">{error}</p>}
      </div>
    );
  }

  return (
    <div>
      {picker(`${idp}-file`, false)}
      <label className="drop" htmlFor={`${idp}-file`}>
        <strong>{busy ? 'Reading the questions…' : `Upload previous / important questions for ${subject.code}`}</strong>
        <span>Any file: PDF, Word, PowerPoint, Excel, text or photos of the question paper. Several files can be picked together. Up to 10 MB per file.</span>
      </label>
      <details className="paste">
        <summary>Paste the questions instead</summary>
        <textarea rows={7} value={text} onChange={(e) => setText(e.target.value)} placeholder={'1. Define a primary key.\n2. Explain the ER model with a neat diagram. (13)'} />
        <button className="primary" disabled={busy || text.trim().length < 20} onClick={savePasted}>Save pasted questions</button>
      </details>
      {error && <p className="error" role="alert">{error}</p>}
    </div>
  );
}
