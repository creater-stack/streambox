'use client';
import { useRef, useState } from 'react';
export default function ProfilePanel({ user }: { user: { username: string; email: string; bio: string | null; avatarUrl: string | null } }) {
  const [username, setUsername] = useState(user.username);
  const [bio, setBio] = useState(user.bio || '');
  const [avatar, setAvatar] = useState(user.avatarUrl);
  const [msg, setMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const save = async () => {
    const res = await fetch('/api/me', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username, bio }) });
    const j = await res.json();
    setMsg(res.ok ? 'Saved ✓' : j.error);
    setTimeout(() => setMsg(''), 2500);
  };
  const uploadAvatar = async (f: File) => {
    const fd = new FormData(); fd.append('file', f);
    const res = await fetch('/api/me/avatar', { method: 'POST', body: fd });
    const j = await res.json();
    if (res.ok) { setAvatar(j.avatarUrl); window.__toast?.('Avatar updated'); }
    else window.__toast?.(j.error, true);
  };
  return (
    <div className="up-card">
      <h3 style={{ fontFamily: 'var(--fd)', marginBottom: 16 }}>Profile</h3>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
        <button className="avatar-btn" style={{ width: 62, height: 62, fontSize: 24 }} onClick={() => fileRef.current?.click()}>
          {avatar ? <img src={avatar} alt="" /> : username[0]?.toUpperCase()}
        </button>
        <div style={{ fontSize: 13, color: 'var(--mut)' }}>{user.email}<br />Tap avatar to change</div>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={e => e.target.files?.[0] && uploadAvatar(e.target.files[0])} />
      </div>
      <div className="field"><label>USERNAME</label><input value={username} onChange={e => setUsername(e.target.value)} /></div>
      <div className="field"><label>BIO</label><textarea value={bio} onChange={e => setBio(e.target.value)} maxLength={300} style={{ minHeight: 60 }} /></div>
      <button className="btn btn-acc btn-sm" onClick={save}>Save profile</button>
      {msg && <span style={{ marginLeft: 10, fontSize: 13, color: 'var(--teal)' }}>{msg}</span>}
    </div>
  );
}
