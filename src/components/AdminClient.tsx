'use client';
import { useEffect, useState } from 'react';
type Stats = { users: number; videos: number; ready: number; processing: number; failed: number; comments: number; views: number; openReports: number };
export default function AdminClient() {
  const [tab, setTab] = useState<'overview' | 'users' | 'videos' | 'reports'>('overview');
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const load = async (t = tab) => {
    if (t === 'overview') fetch('/api/admin/stats').then(r => r.json()).then(setStats);
    if (t === 'users') fetch('/api/admin/users').then(r => r.json()).then(j => setUsers(j.users));
    if (t === 'videos') fetch('/api/admin/videos').then(r => r.json()).then(j => setVideos(j.videos));
    if (t === 'reports') fetch('/api/admin/reports').then(r => r.json()).then(j => setReports(j.reports));
  };
  useEffect(() => { load(tab); /* eslint-disable-next-line */ }, [tab]);
  const suspend = async (id: string, val: boolean) => {
    await fetch(`/api/admin/users/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ suspended: val }) });
    load();
  };
  const delVideo = async (id: string) => {
    if (!confirm('Delete this video and all its files?')) return;
    await fetch(`/api/admin/videos/${id}`, { method: 'DELETE' });
    load();
  };
  const resolve = async (id: string, status: 'RESOLVED' | 'DISMISSED') => {
    await fetch(`/api/admin/reports/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status }) });
    load();
  };
  return (
    <>
      <div className="tabs">
        {(['overview', 'users', 'videos', 'reports'] as const).map(t => (
          <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{t[0].toUpperCase() + t.slice(1)}</button>
        ))}
      </div>
      {tab === 'overview' && stats && (
        <div className="statrow">
          <div className="stat"><div className="num">{stats.users}</div><div className="lbl">Users</div></div>
          <div className="stat"><div className="num">{stats.videos}</div><div className="lbl">Videos</div></div>
          <div className="stat"><div className="num">{stats.ready}</div><div className="lbl">Ready</div></div>
          <div className="stat"><div className="num">{stats.processing}</div><div className="lbl">Processing</div></div>
          <div className="stat"><div className="num">{stats.failed}</div><div className="lbl">Failed</div></div>
          <div className="stat"><div className="num">{stats.views.toLocaleString()}</div><div className="lbl">Total views</div></div>
          <div className="stat"><div className="num">{stats.comments}</div><div className="lbl">Comments</div></div>
          <div className="stat"><div className="num">{stats.openReports}</div><div className="lbl">Open reports</div></div>
        </div>
      )}
      {tab === 'users' && (
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead><tr><th>User</th><th>Email</th><th>Role</th><th>Videos</th><th>Status</th><th /></tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td><b>{u.username}</b></td>
                  <td style={{ color: 'var(--mut)' }}>{u.email}</td>
                  <td>{u.role}</td>
                  <td>{u._count.videos}</td>
                  <td>{u.suspended ? <span className="badge badge-open">SUSPENDED</span> : <span className="badge badge-res">ACTIVE</span>}</td>
                  <td><button className="btn btn-sm" onClick={() => suspend(u.id, !u.suspended)}>{u.suspended ? 'Unsuspend' : 'Suspend'}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {tab === 'videos' && (
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead><tr><th>Title</th><th>Owner</th><th>Status</th><th>Views</th><th /></tr></thead>
            <tbody>
              {videos.map(v => (
                <tr key={v.id}>
                  <td style={{ maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.title}</td>
                  <td>{v.username}</td>
                  <td><span className={`status status-${v.status}`}><span className="dot" />{v.status}</span></td>
                  <td>{v.viewsCount}</td>
                  <td><button className="btn btn-danger btn-sm" onClick={() => delVideo(v.id)}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {tab === 'reports' && (
        <div style={{ overflowX: 'auto' }}>
          {reports.length === 0 && <div className="empty">No reports. 🎉</div>}
          <table className="table">
            <thead><tr><th>Video</th><th>Reason</th><th>Reporter</th><th>Status</th><th /></tr></thead>
            <tbody>
              {reports.map(r => (
                <tr key={r.id}>
                  <td>{r.video?.title || '(deleted)'}</td>
                  <td style={{ maxWidth: 300 }}>{r.reason}</td>
                  <td>{r.user.username}</td>
                  <td><span className={`badge ${r.status === 'OPEN' ? 'badge-open' : 'badge-res'}`}>{r.status}</span></td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {r.status === 'OPEN' && <>
                      <button className="btn btn-sm" onClick={() => resolve(r.id, 'RESOLVED')}>Resolve</button>{' '}
                      <button className="btn btn-sm" onClick={() => resolve(r.id, 'DISMISSED')}>Dismiss</button>{' '}
                      {r.video && <button className="btn btn-danger btn-sm" onClick={() => delVideo(r.video.id)}>Delete video</button>}
                    </>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
