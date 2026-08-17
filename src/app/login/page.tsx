'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr('');
    const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password: pw }) });
    const j = await res.json();
    setBusy(false);
    if (!res.ok) return setErr(j.error || 'Login failed');
    router.push('/dashboard'); router.refresh();
  };
  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>Welcome back</h1>
        <p className="sub">Log in to upload, like and comment.</p>
        {err && <div className="form-err">{err}</div>}
        <form onSubmit={submit}>
          <div className="field"><label>EMAIL</label><input type="email" required value={email} onChange={e => setEmail(e.target.value)} /></div>
          <div className="field"><label>PASSWORD</label><input type="password" required value={pw} onChange={e => setPw(e.target.value)} /></div>
          <button className="btn btn-acc" style={{ width: '100%' }} disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
        </form>
        <div className="auth-alt"><Link href="/forgot">Forgot password?</Link></div>
        <div className="auth-alt">New here? <Link href="/signup">Create an account</Link></div>
      </div>
    </div>
  );
}
