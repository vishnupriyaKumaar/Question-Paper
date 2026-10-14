import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';

const EMPTY = { id: '', code: '', name: '', regulation: '2024', outcomes: '' };

export default function ManageSubjects({ subjects, onClose, onChanged, notify }) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmId, setConfirmId] = useState('');
  const first = useRef(null);

  useEffect(() => {
    first.current?.focus();
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function edit(s) {
    setError('');
    setForm({ id: s.id, code: s.code, name: s.name, regulation: s.regulation || '', outcomes: (s.outcomes || []).join('\n') });
  }

  async function save(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const payload = { code: form.code, name: form.name, regulation: form.regulation, outcomes: form.outcomes };
      const saved = form.id ? await api.updateSubject(form.id, payload) : await api.addSubject(payload);
      notify(form.id ? `Updated ${saved.code}.` : `Added ${saved.code}.`);
      setForm(EMPTY);
      await onChanged(saved.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(s) {
    if (confirmId !== s.id) { setConfirmId(s.id); return; }
    setBusy(true);
    try {
      await api.deleteSubject(s.id);
      notify(`Deleted ${s.code}.`);
      setConfirmId('');
      if (form.id === s.id) setForm(EMPTY);
      await onChanged(null, s.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="ms-h">
        <header className="modal-head">
          <h2 id="ms-h">Manage subjects</h2>
          <button className="ghost" onClick={onClose}>Close</button>
        </header>

        <div className="modal-grid">
          <div>
            <h3>Your subjects</h3>
            {subjects.length === 0 && <p className="muted">No subjects yet. Add the first one using the form.</p>}
            <ul className="subject-list">
              {subjects.map((s) => (
                <li key={s.id}>
                  <div>
                    <strong>{s.code}</strong>
                    <span>{s.name}</span>
                  </div>
                  <div className="row-actions">
                    <button className="ghost" onClick={() => edit(s)}>Edit</button>
                    <button className={confirmId === s.id ? 'danger' : 'ghost'} onClick={() => remove(s)} onBlur={() => setConfirmId('')} disabled={busy}>
                      {confirmId === s.id ? 'Confirm delete' : 'Delete'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <form onSubmit={save}>
            <h3>{form.id ? `Edit ${form.code}` : 'Add a subject'}</h3>
            <label htmlFor="sc">Subject code</label>
            <input id="sc" ref={first} value={form.code} onChange={set('code')} placeholder="CS24401" required maxLength={20} />
            <label htmlFor="sn">Subject name</label>
            <input id="sn" value={form.name} onChange={set('name')} placeholder="Database Management Systems" required maxLength={120} />
            <label htmlFor="sr">Regulation</label>
            <input id="sr" value={form.regulation} onChange={set('regulation')} placeholder="2024" maxLength={10} />
            <label htmlFor="so">Course outcomes (one per line, CO1 first)</label>
            <textarea id="so" rows={6} value={form.outcomes} onChange={set('outcomes')} placeholder={'Construct SQL queries using relational algebra.\nDesign a database using the ER model.'} />
            {error && <p className="error" role="alert">{error}</p>}
            <div className="row-actions">
              <button className="primary" disabled={busy}>{form.id ? 'Save changes' : 'Add subject'}</button>
              {form.id && <button type="button" className="ghost" onClick={() => setForm(EMPTY)}>Cancel edit</button>}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
