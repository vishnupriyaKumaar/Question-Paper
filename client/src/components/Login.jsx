import { useState } from 'react';
import { api, setToken } from '../api.js';

export default function Login({ onDone }) {
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const { token } = await api.login(password);
      setToken(token);
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login">
      <form className="login-card" onSubmit={submit}>
        <img className="login-logo" src="/brand/grt-logo.png" alt="GRT Institute of Engineering and Technology, Tiruttani" />
        <h1>Question Paper Generator</h1>
        <p className="muted">Sign in with the staff password to build Assessment and Model Test papers from your syllabus.</p>
        <label htmlFor="pw">Staff password</label>
        <div className="pw-row">
          <input
            id="pw"
            type={show ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            autoFocus
            required
          />
          <button type="button" className="ghost" onClick={() => setShow((s) => !s)} aria-pressed={show}>
            {show ? 'Hide' : 'Show'}
          </button>
        </div>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="primary" disabled={busy || !password}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </main>
  );
}
