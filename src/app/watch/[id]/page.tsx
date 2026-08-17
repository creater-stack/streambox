import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { videoDTO } from '@/lib/dto';
import VideoCard from '@/components/VideoCard';
import WatchActions from '@/components/WatchActions';
import Comments from '@/components/Comments';
import Player from '@/components/Player';

export const dynamic = 'force-dynamic';

export default async function WatchPage({ params }: { params: { id: string } }) {
  const video = await prisma.video.findUnique({
    where: { id: params.id },
    include: { user: { select: { id: true, username: true, avatarUrl: true, bio: true } }, category: true, tags: { include: { tag: true } } }
  });
  if (!video) notFound();
  const session = await getSession();
  const liked = session ? !!(await prisma.like.findUnique({ where: { videoId_userId: { videoId: video.id, userId: session.id } } })) : false;
  const comments = await prisma.comment.findMany({
    where: { videoId: video.id }, orderBy: { createdAt: 'desc' }, take: 100,
    include: { user: { select: { id: true, username: true, avatarUrl: true } } }
  });
  const related = await prisma.video.findMany({
    where: { id: { not: video.id }, status: 'READY', ...(video.categoryId ? { categoryId: video.categoryId } : {}) },
    orderBy: { viewsCount: 'desc' }, take: 8,
    include: { user: { select: { username: true, avatarUrl: true } }, category: true, tags: { include: { tag: true } } }
  });
  const dto = videoDTO(video);
  const notReady = video.status !== 'READY';
  return (
    <div className="watch-layout">
      <div>
        {notReady ? (
          <div className="empty" style={{ aspectRatio: '16/9', display: 'grid', placeItems: 'center' }}>
            <div>
              <span className={`status status-${video.status}`}><span className="dot" /> {video.status}</span>
              <p style={{ marginTop: 14 }}>{video.status === 'PROCESSING' ? 'This video is being transcoded to HLS. Check back shortly.' : video.status === 'FAILED' ? `Processing failed: ${video.failReason || 'unknown error'}` : 'Still uploading.'}</p>
            </div>
          </div>
        ) : (
          <Player src={dto.hlsUrl!} poster={dto.thumbUrl} />
        )}
        <h1 className="watch-title">{video.title}</h1>
        <div className="watch-row">
          <div className="creator">
            <div className="vav">{video.user.avatarUrl ? <img src={`/api/media/${video.user.avatarUrl}`} alt="" /> : video.user.username[0].toUpperCase()}</div>
            <div>
              <div className="name">{video.user.username}</div>
              <div className="sub">{new Date(video.publishedAt || video.createdAt).toLocaleDateString()} · {video.viewsCount.toLocaleString()} views</div>
            </div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <WatchActions videoId={video.id} liked={liked} likes={video.likesCount} authed={!!session} />
          </div>
        </div>
        <div className="desc-box">
          {video.description || 'No description.'}
          {video.tags.length > 0 && (
            <div className="tags">{video.tags.map(t => <span key={t.tagId} className="tagchip">#{t.tag.name}</span>)}</div>
          )}
        </div>
        <Comments videoId={video.id} initial={comments as any} authedUserId={session?.id || null} authedRole={session?.role || null} />
      </div>
      <aside>
        <h3 style={{ fontFamily: 'var(--fd)', marginBottom: 14 }}>Up next</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {related.length === 0 && <p style={{ color: 'var(--mut)' }}>No related videos yet.</p>}
          {related.map(r => <VideoCard key={r.id} v={videoDTO(r)} />)}
        </div>
        {session && (
          <p style={{ marginTop: 24, fontSize: 13, color: 'var(--dim)' }}>
            See something wrong?{' '}
            <Link href="#" style={{ color: 'var(--acc)' }} onClick={e => { e.preventDefault(); const reason = prompt('Why are you reporting this video?'); if (reason && reason.length >= 3) fetch(`/api/videos/${video.id}/report`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ reason }) }).then(() => window.__toast?.('Report submitted — thank you')); }}>Report this video</Link>
          </p>
        )}
      </aside>
    </div>
  );
}
