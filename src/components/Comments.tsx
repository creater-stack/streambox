'use client';
import { useState } from 'react';
type C = { id: string; body: string; createdAt: string; userId: string; user: { username: string; avatarUrl: string | null } };
export default function Comments({ videoId, initial, authedUserId, authedRole }: { videoId: string; initial: C[]; authedUserId: string | null; authedRole: string | null }) {
  const [list, setList] = useState<C[]>(initial);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const post = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authedUserId) { window.__toast?.('Log in to comment', true); return; }
    if (!body.trim()) return;
    setBusy(true);
    const res = await fetch(`/api/videos/${videoId}/comments`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ body }) });
    const j = await res.json();
    setBusy(false);
    if (!res.ok) return window.__toast?.(j.error || 'Failed', true);
    setList(l => [j, ...l]); setBody('');
  };
  const del = async (id: string) => {
    const res = await fetch(`/api/comments/${id}`, { method: 'DELETE' });
    if (res.ok) setList(l => l.filter(c => c.id !== id));
    else window.__toast?.('Cannot delete', true);
  };
  return (
    <div className="comments">
      <h3>{list.length} Comments</h3>
      <form onSubmit={post} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
        <input
          value={body} onChange={e => setBody(e.target.value)} maxLength={1000}
          placeholder={authedUserId ? 'Add a comment…' : 'Log in to comment'}
          disabled={!authedUserId || busy}
          style={{ flex: 1, padding: '11px 14px', borderRadius: 10, background: 'var(--bg2)', border: '1px solid var(--line)', outline: 'none' }}
        />
        <button className="btn btn-acc btn-sm" disabled={!authedUserId || busy || !body.trim()}>Post</button>
      </form>
      {list.map(c => (
        <div className="crow" key={c.id}>
          <div className="vav">{c.user.avatarUrl ? <img src={c.user.avatarUrl} alt="" /> : c.user.username[0].toUpperCase()}</div>
          <div style={{ flex: 1 }}>
            <span className="who">{c.user.username}</span>
            <span className="when">{new Date(c.createdAt).toLocaleString()}</span>
            <div className="body" style={{ marginTop: 3 }}>{c.body}</div>
          </div>
          {(authedUserId === c.userId || authedRole === 'ADMIN') && (
            <button className="del" onClick={() => del(c.id)}>delete</button>
          )}
        </div>
      ))}
    </div>
  );
}
