'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import Logo from './Logo';
type Me = { id: string; username: string; role: string; avatarUrl: string | null };
export default function Navbar() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [me, setMe] = useState<Me | null>(null);
  const [open, setOpen] = useState(false);
  const popRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    fetch('/api/me').then(r => r.ok ? r.json() : null).then(setMe).catch(() => {});
  }, []);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (popRef.current && !popRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const search = () => router.push(q.trim() ? `/?q=${encodeURIComponent(q.trim())}` : '/');
  const logout = async () => { await fetch('/api/auth/logout', { method: 'POST' }); router.push('/'); router.refresh(); };
  return (
    <nav className="nav">
      <Link href="/" className="brand"><Logo /><span>Stream<span className="bx">Box</span></span></Link>
      <div className="searchwrap">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()} placeholder="Search videos…" aria-label="Search" />
      </div>
      <div className="nav-right" ref={popRef}>
        {me ? (
          <>
            <Link href="/upload" className="btn btn-acc btn-sm">＋ Upload</Link>
            <button className="avatar-btn" onClick={() => setOpen(o => !o)} aria-label="Account menu">
              {me.avatarUrl ? <img src={me.avatarUrl} alt="" /> : me.username[0].toUpperCase()}
            </button>
            {open && (
              <div className="menu-pop">
                <a href="/dashboard">My dashboard</a>
                <a href="/upload">Upload video</a>
                {me.role === 'ADMIN' && <a href="/admin">Admin panel</a>}
                <button onClick={logout}>Log out</button>
              </div>
            )}
          </>
        ) : (
          <>
            <Link href="/login" className="btn btn-ghost btn-sm">Log in</Link>
            <Link href="/signup" className="btn btn-acc btn-sm">Sign up</Link>
          </>
        )}
      </div>
    </nav>
  );
}
