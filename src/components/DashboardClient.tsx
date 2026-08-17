'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { fmtDur, fmtViews } from './VideoCard';
type V = { id: string; title: string; status: string; failReason?: string | null; thumbPath?: string | null; duration?: number | null; viewsCount: number; likesCount: number; createdAt: string };
export default function DashboardClient({ videos: initial }: { videos: V[] }) {
  const [videos, setVideos] = useState(initial);
  const anyBusy = videos.some(v => v.status === 'PROCESSING' || v.status === 'UPLOADING');
  useEffect(() => {
    if (!anyBusy) return;
    const t = setInterval(async () => {
      const res = await fetch('/api/videos?mine=1');
      if (res.ok) {
        const j = await res.json();
        setVideos(prev => prev.map(p => {
          const fresh = j.videos.find((x: any) => x.id === p.id);
          return fresh ? { ...p, status: fresh.status, duration: fresh.duration, viewsCount: fresh.viewsCount } : p;
        }));
      }
    }, 5000);
    return () => clearInterval(t);
  }, [anyBusy]);
  const del = async (id: string) => {
    if (!confirm('Delete this video permanently?')) return;
    const res = await fetch(`/api/videos/${id}`, { method: 'DELETE' });
    if (res.ok) { setVideos(v => v.filter(x => x.id !== id)); window.__toast?.('Video deleted'); }
    else window.__toast?.((await res.json()).error || 'Delete failed', true);
  };
  if (videos.length === 0)
    return <div className="empty">No videos yet. <Link href="/upload" style={{ color: 'var(--acc)', fontWeight: 600 }}>Upload your first one →</Link></div>;
  return (
    <div>
      {videos.map(v => (
        <div className="drow" key={v.id}>
          <div className="thumb">{v.thumbPath && <img src={`/api/media/${v.thumbPath}`} alt="" />}</div>
          <div>
            <div style={{ fontWeight: 600, marginBottom: 5 }}>{v.status === 'READY' ? <Link href={`/watch/${v.id}`}>{v.title}</Link> : v.title}</div>
            <span className={`status status-${v.status}`}><span className="dot" /> {v.status}</span>
            {v.status === 'FAILED' && v.failReason && <div style={{ color: 'var(--err)', fontSize: 12, marginTop: 6 }}>{v.failReason}</div>}
            <div style={{ color: 'var(--mut)', fontSize: 12.5, marginTop: 6 }}>
              {fmtViews(v.viewsCount)} views · {v.likesCount} likes{v.duration ? ` · ${fmtDur(v.duration)}` : ''} · {new Date(v.createdAt).toLocaleDateString()}
            </div>
          </div>
          <div className="acts" style={{ display: 'flex', gap: 8 }}>
            <Link href={`/dashboard/${v.id}`} className="btn btn-sm">Edit</Link>
            <button className="btn btn-danger btn-sm" onClick={() => del(v.id)}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}
