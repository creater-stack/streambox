import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/guard';
import { videoDTO } from '@/lib/dto';
export async function GET() {
  const { res } = await requireAdmin();
  if (res) return res;
  const videos = await prisma.video.findMany({
    orderBy: { createdAt: 'desc' }, take: 200,
    include: { user: { select: { username: true, avatarUrl: true } }, category: true, tags: { include: { tag: true } } }
  });
  return NextResponse.json({ videos: videos.map(videoDTO) });
}
