'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
export default function Signup() {
  const router = useRouter();
  const [f, setF] = useState({ username: '', email: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr('');
    const res = await fetch('/api/auth/signup', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(f) });
    const j = await res.json();
    setBusy(false);
    if (!res.ok) return setErr(j.error || 'Signup failed');
    router.push('/dashboard'); router.refresh();
  };
  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>Join StreamBox</h1>
        <p className="sub">Upload videos — they get transcoded to adaptive HLS automatically.</p>
        {err && <div className="form-err">{err}</div>}
        <form onSubmit={submit}>
          <div className="field"><label>USERNAME</label><input required minLength={3} maxLength={24} value={f.username} onChange={e => setF({ ...f, username: e.target.value })} /></div>
          <div className="field"><label>EMAIL</label><input type="email" required value={f.email} onChange={e => setF({ ...f, email: e.target.value })} /></div>
          <div className="field"><label>PASSWORD (min 8)</label><input type="password" required minLength={8} value={f.password} onChange={e => setF({ ...f, password: e.target.value })} /></div>
          <button className="btn btn-acc" style={{ width: '100%' }} disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button>
        </form>
        <div className="auth-alt">Already have an account? <Link href="/login">Log in</Link></div>
      </div>
    </div>
  );
}
