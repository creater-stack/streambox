'use client';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
type Props = {
  video: { id: string; title: string; description: string; categoryId: string; tags: string[]; thumbUrl: string | null };
  categories: { id: string; name: string }[];
};
export default function EditVideoForm({ video, categories }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(video.title);
  const [desc, setDesc] = useState(video.description);
  const [cat, setCat] = useState(video.categoryId);
  const [tags, setTags] = useState(video.tags.join(', '));
  const [thumb, setThumb] = useState(video.thumbUrl);
  const [msg, setMsg] = useState('');
  const thumbRef = useRef<HTMLInputElement>(null);
  const save = async () => {
    const res = await fetch(`/api/videos/${video.id}`, {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title, description: desc, categoryId: cat || null, tags: tags.split(',').map(t => t.trim()).filter(Boolean) })
    });
    const j = await res.json();
    setMsg(res.ok ? 'Saved ✓' : j.error);
    setTimeout(() => setMsg(''), 2500);
  };
  const replaceThumb = async (f: File) => {
    const fd = new FormData(); fd.append('file', f);
    const res = await fetch(`/api/videos/${video.id}/thumbnail`, { method: 'POST', body: fd });
    const j = await res.json();
    if (res.ok) { setThumb(j.thumbUrl + '?t=' + Date.now()); window.__toast?.('Thumbnail updated'); }
    else window.__toast?.(j.error, true);
  };
  const del = async () => {
    if (!confirm('Delete this video permanently?')) return;
    const res = await fetch(`/api/videos/${video.id}`, { method: 'DELETE' });
    if (res.ok) { window.__toast?.('Deleted'); router.push('/dashboard'); router.refresh(); }
  };
  return (
    <div className="up-card">
      <div style={{ display: 'flex', gap: 18, marginBottom: 18, flexWrap: 'wrap' }}>
        {thumb && <img src={thumb} alt="" style={{ width: 200, borderRadius: 12, border: '1px solid var(--line2)' }} />}
        <div>
          <button className="btn btn-sm" onClick={() => thumbRef.current?.click()}>Replace thumbnail</button>
          <input ref={thumbRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={e => e.target.files?.[0] && replaceThumb(e.target.files[0])} />
          <p style={{ color: 'var(--dim)', fontSize: 12.5, marginTop: 8 }}>JPG / PNG / WEBP, max 5 MB</p>
        </div>
      </div>
      <div className="field"><label>TITLE</label><input value={title} onChange={e => setTitle(e.target.value)} maxLength={120} /></div>
      <div className="field"><label>DESCRIPTION</label><textarea value={desc} onChange={e => setDesc(e.target.value)} maxLength={5000} /></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div className="field"><label>CATEGORY</label>
          <select value={cat} onChange={e => setCat(e.target.value)}>
            <option value="">— none —</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="field"><label>TAGS</label><input value={tags} onChange={e => setTags(e.target.value)} /></div>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-acc" onClick={save}>Save changes</button>
        <button className="btn btn-danger" onClick={del}>Delete video</button>
        {msg && <span style={{ alignSelf: 'center', color: 'var(--teal)', fontSize: 14 }}>{msg}</span>}
      </div>
    </div>
  );
}
