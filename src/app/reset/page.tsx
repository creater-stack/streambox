'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
function ResetInner() {
  const token = useSearchParams().get('token') || '';
  const [pw, setPw] = useState('');
  const [msg, setMsg] = useState<'idle' | 'ok' | 'fail'>('idle');
  const [err, setErr] = useState('');
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/auth/reset', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token, password: pw }) });
    const j = await res.json();
    if (!res.ok) { setMsg('fail'); setErr(j.error || 'Failed'); }
    else setMsg('ok');
  };
  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>Choose a new password</h1>
        <p className="sub">{token ? 'Token accepted — set your new password.' : 'Missing token. Use the link from your email.'}</p>
        {msg === 'ok' ? (
          <div className="auth-alt">Password updated. <Link href="/login">Log in →</Link></div>
        ) : (
          <form onSubmit={submit}>
            {(err || msg === 'fail') && <div className="form-err">{err}</div>}
            <div className="field"><label>NEW PASSWORD (min 8)</label><input type="password" required minLength={8} value={pw} onChange={e => setPw(e.target.value)} disabled={!token} /></div>
            <button className="btn btn-acc" style={{ width: '100%' }} disabled={!token}>Update password</button>
          </form>
        )}
      </div>
    </div>
  );
}
export default function Reset() { return <Suspense><ResetInner /></Suspense>; }
