import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import DashboardClient from '@/components/DashboardClient';
import ProfilePanel from '@/components/ProfilePanel';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const user = await getSession();
  if (!user) redirect('/login');
  const videos = await prisma.video.findMany({
    where: { userId: user.id }, orderBy: { createdAt: 'desc' },
    include: { user: { select: { username: true, avatarUrl: true } }, category: true, tags: { include: { tag: true } } }
  });
  const totals = await prisma.video.aggregate({ where: { userId: user.id }, _sum: { viewsCount: true, likesCount: true } });
  return (
    <>
      <h1 className="page-title">Your studio</h1>
      <p className="page-sub">Manage uploads, watch processing status, edit metadata.</p>
      <div className="statrow">
        <div className="stat"><div className="num">{videos.length}</div><div className="lbl">Videos</div></div>
        <div className="stat"><div className="num">{(totals._sum.viewsCount || 0).toLocaleString()}</div><div className="lbl">Total views</div></div>
        <div className="stat"><div className="num">{(totals._sum.likesCount || 0).toLocaleString()}</div><div className="lbl">Total likes</div></div>
        <div className="stat"><div className="num">{videos.filter(v => v.status === 'PROCESSING' || v.status === 'UPLOADING').length}</div><div className="lbl">In pipeline</div></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 320px', gap: 28, alignItems: 'start' }}>
        <DashboardClient videos={videos.map(v => ({ id: v.id, title: v.title, status: v.status, failReason: v.failReason, thumbPath: v.thumbPath, duration: v.duration, viewsCount: v.viewsCount, likesCount: v.likesCount, createdAt: v.createdAt.toISOString() })) as any} />
        <ProfilePanel user={{ username: user.username, email: user.email, bio: user.bio, avatarUrl: user.avatarUrl ? `/api/media/${user.avatarUrl}` : null }} />
      </div>
    </>
  );
}
