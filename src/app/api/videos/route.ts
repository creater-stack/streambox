import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { videoDTO } from '@/lib/dto';

const include = { user: { select: { username: true, avatarUrl: true } }, category: true, tags: { include: { tag: true } } };

export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const q = sp.get('q')?.trim();
  const cat = sp.get('cat');
  const sort = sp.get('sort') || 'latest';
  const mine = sp.get('mine') === '1';
  const session = await getSession();
  const where: any = { status: 'READY' };
  if (q) where.title = { contains: q, mode: 'insensitive' };
  if (cat) where.category = { slug: cat };
  if (mine && session) { where.userId = session.id; where.status = undefined; }
  let videos;
  if (sort === 'trending') {
    const since = new Date(Date.now() - 30 * 864e5);
    const hot = await prisma.view.groupBy({ by: ['videoId'], where: { createdAt: { gte: since } }, _count: { _all: true }, orderBy: { _count: { videoId: 'desc' } }, take: 24 });
    const ids = hot.map(h => h.videoId);
    videos = ids.length
      ? await prisma.video.findMany({ where: { id: { in: ids }, status: 'READY' }, include })
      : await prisma.video.findMany({ where, orderBy: { viewsCount: 'desc' }, take: 24, include });
    videos.sort((a: any, b: any) => ids.indexOf(a.id) - ids.indexOf(b.id));
  } else {
    videos = await prisma.video.findMany({
      where, include, take: 48,
      orderBy: sort === 'views' ? { viewsCount: 'desc' } : { publishedAt: 'desc' }
    });
  }
  return NextResponse.json({ videos: videos.map(videoDTO) });
}
