import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const comment = await prisma.comment.findUnique({ where: { id: params.id } });
  if (!comment) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (comment.userId !== user.id && user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  await prisma.$transaction([
    prisma.comment.delete({ where: { id: comment.id } }),
    prisma.video.update({ where: { id: comment.videoId }, data: { commentsCount: { decrement: 1 } } })
  ]);
  return NextResponse.json({ ok: true });
}
