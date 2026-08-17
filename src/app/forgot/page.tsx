'use client';
import { useState } from 'react';
export default function Forgot() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    await fetch('/api/auth/forgot', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email }) });
    setBusy(false); setSent(true);
  };
  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>Reset password</h1>
        <p className="sub">We will send a reset link (or print it in the server terminal if email is not configured).</p>
        {sent ? (
          <p style={{ color: 'var(--teal)' }}>If that email exists, a reset link is on its way. Check your inbox — or the dev server terminal.</p>
        ) : (
          <form onSubmit={submit}>
            <div className="field"><label>EMAIL</label><input type="email" required value={email} onChange={e => setEmail(e.target.value)} /></div>
            <button className="btn btn-acc" style={{ width: '100%' }} disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</button>
          </form>
        )}
      </div>
    </div>
  );
}
