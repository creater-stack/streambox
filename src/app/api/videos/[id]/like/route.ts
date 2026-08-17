import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Login to like videos' }, { status: 401 });
  const video = await prisma.video.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!video) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const key = { videoId_userId: { videoId: video.id, userId: user.id } };
  const existing = await prisma.like.findUnique({ where: key });
  if (existing) {
    await prisma.$transaction([
      prisma.like.delete({ where: key }),
      prisma.video.update({ where: { id: video.id }, data: { likesCount: { decrement: 1 } } })
    ]);
    return NextResponse.json({ liked: false });
  }
  await prisma.$transaction([
    prisma.like.create({ data: { videoId: video.id, userId: user.id } }),
    prisma.video.update({ where: { id: video.id }, data: { likesCount: { increment: 1 } } })
  ]);
  return NextResponse.json({ liked: true });
}
