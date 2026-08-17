import Link from 'next/link';
export type VideoDTO = {
  id: string; title: string; thumbUrl: string | null; duration: number | null;
  viewsCount: number; createdAt: string; publishedAt?: string | null;
  username?: string; avatarUrl?: string | null; status?: string;
};
export function fmtDur(s: number | null) {
  if (!s) return '';
  const m = Math.floor(s / 60), ss = Math.floor(s % 60), h = Math.floor(m / 60);
  return h ? `${h}:${String(m % 60).padStart(2, '0')}:${String(ss).padStart(2, '0')}` : `${m}:${String(ss).padStart(2, '0')}`;
}
export function fmtViews(n: number) {
  return n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : String(n);
}
export function timeAgo(d: string) {
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`;
  return new Date(d).toLocaleDateString();
}
export default function VideoCard({ v }: { v: VideoDTO }) {
  return (
    <Link href={`/watch/${v.id}`} className="vcard">
      <div className="vthumb">
        {v.thumbUrl ? <img src={v.thumbUrl} alt="" loading="lazy" /> : <div style={{ width: '100%', height: '100%' }} className="skel" />}
        {v.duration ? <span className="dur">{fmtDur(v.duration)}</span> : null}
        <div className="play-ov"><span>▶</span></div>
      </div>
      <div className="vinfo">
        <div className="vav">{v.avatarUrl ? <img src={v.avatarUrl} alt="" /> : (v.username?.[0] || '?').toUpperCase()}</div>
        <div>
          <div className="vtitle">{v.title}</div>
          <div className="vmeta"><b>{v.username}</b> · {fmtViews(v.viewsCount)} views · {timeAgo(v.publishedAt || v.createdAt)}</div>
        </div>
      </div>
    </Link>
  );
}
