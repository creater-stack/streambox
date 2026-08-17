'use client';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

const CHUNK = 3 * 1024 * 1024;
type Phase = 'idle' | 'meta' | 'uploading' | 'uploaded' | 'finishing' | 'done' | 'failed';

export default function UploadPage() {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [over, setOver] = useState(false);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState('');
  const [meta, setMeta] = useState({ title: '', description: '', categoryId: '', tags: '' });
  const [cats, setCats] = useState<{ id: string; name: string }[]>([]);
  const [thumb, setThumb] = useState<File | null>(null);
  const [thumbUrl, setThumbUrl] = useState('');
  const [errMsg, setErrMsg] = useState('');
  const ids = useRef<{ uploadId: string; videoId: string } | null>(null);
  const offsetRef = useRef(0);
  const pausedRef = useRef(false);
  const [paused, setPaused] = useState(false);
  const [online, setOnline] = useState(true);

  useEffect(() => { fetch('/api/categories').then(r => r.json()).then(j => setCats(j.categories)).catch(() => {}); }, []);
  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener('online', on); window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  const pick = (f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith('video/') && !/\.(mp4|webm|mov|mkv|avi|ogv)$/i.test(f.name)) {
      window.__toast?.('Please choose a video file', true); return;
    }
    setFile(f); setPhase('meta');
    if (!meta.title) setMeta(m => ({ ...m, title: f.name.replace(/\.[^.]+$/, '') }));
  };

  const chunkLoop = useCallback(async (f: File) => {
    if (!ids.current) return;
    const { uploadId } = ids.current;
    let retries = 0;
    while (offsetRef.current < f.size) {
      if (pausedRef.current) return;
      if (!navigator.onLine) {
        setSpeed('Offline — waiting for connection…');
        await new Promise(r => setTimeout(r, 1500));
        continue;
      }
      const end = Math.min(offsetRef.current + CHUNK, f.size);
      const blob = f.slice(offsetRef.current, end);
      try {
        const res = await fetch(`/api/uploads/${uploadId}/chunk`, {
          method: 'PATCH',
          headers: { 'upload-offset': String(offsetRef.current), 'content-type': 'application/octet-stream' },
          body: blob
        });
        const j = await res.json();
        if (res.status === 409) { offsetRef.current = Number(j.offset); continue; }
        if (!res.ok) throw new Error(j.error || 'chunk failed');
        offsetRef.current = Number(j.offset);
        retries = 0;
        setProgress(offsetRef.current / f.size);
        setSpeed(`${((offsetRef.current / 1048576)).toFixed(1)} / ${(f.size / 1048576).toFixed(1)} MB`);
      } catch {
        retries++;
        if (retries > 12) { setPhase('failed'); setErrMsg('Too many failures. Press Resume to continue from the last byte.'); return; }
        setSpeed(`Connection issue — retry ${retries}…`);
        await new Promise(r => setTimeout(r, Math.min(retries * 1200, 8000)));
        try {
          const st = await fetch(`/api/uploads/${uploadId}`).then(r => r.json());
          if (typeof st.offset === 'number') offsetRef.current = st.offset;
        } catch {}
      }
    }
    setPhase('uploaded');
  }, []);

  const startUpload = async () => {
    if (!file) return;
    if (meta.title.trim().length < 3) { window.__toast?.('Title needs at least 3 characters', true); return; }
    setPhase('uploading'); setErrMsg(''); pausedRef.current = false; setPaused(false);
    try {
      const res = await fetch('/api/uploads/init', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          filename: file.name, size: file.size, mimetype: file.type || 'video/mp4',
          title: meta.title.trim(), description: meta.description,
          categoryId: meta.categoryId || null,
          tags: meta.tags.split(',').map(t => t.trim()).filter(Boolean)
        })
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      ids.current = { uploadId: j.uploadId, videoId: j.videoId };
      offsetRef.current = Number(j.offset || 0);
      await chunkLoop(file);
    } catch (e: any) { setPhase('failed'); setErrMsg(e.message || 'Upload failed'); }
  };

  const resume = async () => {
    if (!file || !ids.current) return;
    pausedRef.current = false; setPaused(false); setPhase('uploading');
    const st = await fetch(`/api/uploads/${ids.current.uploadId}`).then(r => r.json()).catch(() => null);
    if (st && typeof st.offset === 'number') offsetRef.current = st.offset;
    setProgress(offsetRef.current / file.size);
    await chunkLoop(file);
  };

  const finish = async () => {
    if (!ids.current) return;
    setPhase('finishing');
    try {
      if (thumb) {
        const fd = new FormData(); fd.append('file', thumb);
        await fetch(`/api/videos/${ids.current.videoId}/thumbnail`, { method: 'POST', body: fd });
      }
      const res = await fetch(`/api/videos/${ids.current.videoId}/complete`, { method: 'POST' });
      if (!res.ok) throw new Error((await res.json()).error);
      setPhase('done');
      window.__toast?.('Upload complete — processing started!');
      setTimeout(() => router.push('/dashboard'), 900);
    } catch (e: any) { setPhase('uploaded'); window.__toast?.(e.message || 'Finish failed', true); }
  };

  const cancel = async () => {
    if (ids.current) await fetch(`/api/uploads/${ids.current.uploadId}`, { method: 'DELETE' }).catch(() => {});
    router.push('/dashboard');
  };

  return (
    <>
      <h1 className="page-title">Upload a video</h1>
      <p className="page-sub">Files are transcoded to adaptive HLS (360p–1080p) after upload.</p>
      <div style={{ maxWidth: 760, marginTop: 26 }}>
        {phase === 'idle' && (
          <div
            className={`drop${over ? ' over' : ''}`}
            onClick={() => fileInput.current?.click()}
            onDragOver={e => { e.preventDefault(); setOver(true); }}
            onDragLeave={() => setOver(false)}
            onDrop={e => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files?.[0]); }}
          >
            <div className="ic">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#ff5c38" strokeWidth="2" strokeLinecap="round"><path d="M12 16V4m0 0 4 4m-4-4-4 4M4 20h16"/></svg>
            </div>
            <h2>Drag &amp; drop your video</h2>
            <p>or tap to browse · MP4, WEBM, MOV, MKV</p>
            <p style={{ fontSize: 12.5 }}>Interrupted? Uploads resume automatically from the last received byte.</p>
            <input ref={fileInput} type="file" accept="video/*,.mkv" hidden onChange={e => pick(e.target.files?.[0])} />
          </div>
        )}
        {phase === 'meta' && file && (
          <div className="up-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 8 }}>
              <div>
                <strong style={{ fontFamily: 'var(--fd)' }}>{file.name}</strong>
                <div style={{ color: 'var(--mut)', fontSize: 13 }}>{(file.size / 1048576).toFixed(1)} MB</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => { setFile(null); setPhase('idle'); }}>Change file</button>
            </div>
            <div className="field"><label>TITLE *</label><input value={meta.title} onChange={e => setMeta({ ...meta, title: e.target.value })} maxLength={120} /></div>
            <div className="field"><label>DESCRIPTION</label><textarea value={meta.description} onChange={e => setMeta({ ...meta, description: e.target.value })} maxLength={5000} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="field"><label>CATEGORY</label>
                <select value={meta.categoryId} onChange={e => setMeta({ ...meta, categoryId: e.target.value })}>
                  <option value="">— none —</option>
                  {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="field"><label>TAGS (comma separated)</label><input value={meta.tags} onChange={e => setMeta({ ...meta, tags: e.target.value })} placeholder="tutorial, music" /></div>
            </div>
            <div className="field">
              <label>CUSTOM THUMBNAIL (optional)</label>
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => { const f = e.target.files?.[0] || null; setThumb(f); if (f) setThumbUrl(URL.createObjectURL(f)); }} />
              {thumbUrl && <img src={thumbUrl} alt="" style={{ width: 160, borderRadius: 10, marginTop: 8, border: '1px solid var(--line2)' }} />}
            </div>
            <button className="btn btn-acc" onClick={startUpload}>Start upload ▲</button>
          </div>
        )}
        {phase === 'uploading' && (
          <div className="up-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span className="status status-UPLOADING"><span className="dot" /> UPLOADING {paused ? '(paused)' : ''}</span>
              <span style={{ fontFamily: 'var(--fd)', fontWeight: 700 }}>{(progress * 100).toFixed(1)}%</span>
            </div>
            <div className="progress-outer"><div className="progress-inner" style={{ width: `${progress * 100}%` }} /></div>
            <div style={{ color: 'var(--mut)', fontSize: 13, marginTop: 10, minHeight: 20 }}>{speed || (!online && 'You are offline — upload will resume automatically.')}</div>
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button className="btn btn-sm" onClick={() => { pausedRef.current = !pausedRef.current; setPaused(p => !p); if (pausedRef.current === false) resume(); }}>{paused ? 'Resume' : 'Pause'}</button>
              <button className="btn btn-danger btn-sm" onClick={cancel}>Cancel</button>
            </div>
          </div>
        )}
        {phase === 'uploaded' && (
          <div className="up-card">
            <span className="status status-READY"><span className="dot" /> ALL BYTES RECEIVED</span>
            <p style={{ margin: '14px 0', color: 'var(--mut)' }}>Finish to start FFmpeg processing (HLS ladder + thumbnail).</p>
            <button className="btn btn-acc" onClick={finish}>Finish &amp; process</button>
          </div>
        )}
        {phase === 'finishing' && <div className="up-card"><span className="status status-PROCESSING"><span className="dot" /> STARTING PROCESSOR…</span></div>}
        {phase === 'done' && <div className="up-card"><span className="status status-READY"><span className="dot" /> UPLOADED — REDIRECTING…</span></div>}
        {phase === 'failed' && (
          <div className="up-card">
            <span className="status status-FAILED"><span className="dot" /> UPLOAD FAILED</span>
            <p style={{ color: 'var(--mut)', margin: '12px 0' }}>{errMsg}</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-acc" onClick={resume}>Resume from last byte</button>
              <button className="btn btn-danger" onClick={cancel}>Discard</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
