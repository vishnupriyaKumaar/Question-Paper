import { useRef, useState } from 'react';
import { api } from '../api.js';

export const ACCEPT = '.pdf,.docx,.doc,.docm,.dot,.dotx,.pptx,.xlsx,.odt,.odp,.ods,.rtf,.txt,.md,.csv,.html,.htm,.json,.jpg,.jpeg,.png,.webp,.gif,.bmp,.tif,.tiff,image/*';
export const MAX_FILE = 10 * 1024 * 1024; // largest single file
export const BATCH = 3.8 * 1024 * 1024; // files are sent in batches under the host's ~4.5 MB request limit

// Big phone photos are scaled down in the browser so the upload stays small; text stays readable.
export async function shrink(file) {
  if (!file.type.startsWith('image/') || file.size < 1.2 * 1024 * 1024 || /gif|tiff?/i.test(file.type)) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 2600 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.86));
    return blob ? new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }) : file;
  } catch { return file; }
}

export const fmt = (iso) => (iso ? new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '');

export default function SyllabusStep({ subject, syl, setSyl, notify }) {
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [text, setText] = useState('');
  const [confirmDel, setConfirmDel] = useState(false);

  async function send(payload, replace) {
    setError('');
    setBusy(true);
    try {
      const info = await api.uploadSyllabus(subject.id, payload, replace);
      setSyl(info);
      setText('');
      notify(replace ? 'Syllabus updated.' : 'Syllabus uploaded.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function remove() {
    if (!confirmDel) { setConfirmDel(true); return; }
    setBusy(true);
    try {
      await api.deleteSyllabus(subject.id);
      setSyl({ uploaded: false });
      setConfirmDel(false);
      notify('Syllabus deleted.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const onFile = (replace) => async (e) => {
    const picked = Array.from(e.target.files || []);
    if (!picked.length) return;
    setBusy(true);
    const files = await Promise.all(picked.map(shrink));
    setBusy(false);
    const big = files.find((f) => f.size > MAX_FILE);
    if (big) {
      setError(`“${big.name}” is bigger than 10 MB. Use a smaller file.`);
      if (fileRef.current) fileRef.current.value = '';
      return;
    }
    // group into batches; the first replaces/creates, the rest are appended
    const batches = [];
    let cur = []; let size = 0;
    for (const f of files) {
      if (cur.length && size + f.size > BATCH) { batches.push(cur); cur = []; size = 0; }
      cur.push(f); size += f.size;
    }
    if (cur.length) batches.push(cur);
    setError(''); setBusy(true);
    try {
      let info;
      for (let i = 0; i < batches.length; i++) info = await api.uploadSyllabus(subject.id, { files: batches[i] }, i === 0 ? replace : true, i > 0);
      setSyl(info); setText('');
      notify(replace ? 'Syllabus updated.' : 'Syllabus uploaded.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  if (!syl) return <p className="muted">Checking for an uploaded syllabus…</p>;

  if (syl.uploaded) {
    return (
      <div>
        <div className="uploaded">
          <div>
            <p className="ok-line"><span className="tick" aria-hidden="true">✓</span> Syllabus uploaded</p>
            <p className="muted">{syl.fileName} · {fmt(syl.uploadedAt)}</p>
          </div>
          <div className="row-actions">
            <input ref={fileRef} type="file" accept={ACCEPT} multiple hidden id="replace-file" onChange={onFile(true)} />
            <button className="ghost" onClick={() => fileRef.current?.click()} disabled={busy}>Update syllabus</button>
            <button className={confirmDel ? 'danger' : 'ghost'} onClick={remove} onBlur={() => setConfirmDel(false)} disabled={busy}>
              {confirmDel ? 'Confirm delete' : 'Delete'}
            </button>
          </div>
        </div>
        {syl.fallback && <p className="warn">No “UNIT I, UNIT II…” headings were found, so the text was split into 5 equal parts. Check that the right file was uploaded.</p>}
        <ul className="unit-chips" aria-label="Units found in the syllabus">
          {syl.units.map((u) => (
            <li key={u.n}><strong>Unit {u.n}</strong><span>{u.title}</span><small>{u.topicCount} topics</small></li>
          ))}
        </ul>
        {error && <p className="error" role="alert">{error}</p>}
      </div>
    );
  }

  return (
    <div>
      <input ref={fileRef} type="file" accept={ACCEPT} multiple hidden id="syl-file" onChange={onFile(false)} />
      <label className="drop" htmlFor="syl-file">
        <strong>{busy ? 'Reading the syllabus (pictures may take a few seconds)…' : `Upload the syllabus for ${subject.code}`}</strong>
        <span>Any file works: PDF, Word, PowerPoint, Excel, text, or a photo/screenshot (JPG, PNG…). You can pick several pages at once. Up to 10 MB per file. Units should start with “UNIT I”, “UNIT II”…</span>
      </label>
      <details className="paste">
        <summary>Paste the syllabus text instead</summary>
        <textarea rows={7} value={text} onChange={(e) => setText(e.target.value)} placeholder={'UNIT I RELATIONAL DATABASES\nPurpose of database system – Views of data – …'} />
        <button className="primary" disabled={busy || text.trim().length < 40} onClick={() => send({ text }, false)}>Save pasted syllabus</button>
      </details>
      {error && <p className="error" role="alert">{error}</p>}
    </div>
  );
}
