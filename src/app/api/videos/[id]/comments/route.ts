import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { commentSchema } from '@/lib/validate';
import { rateLimit, ipOf } from '@/lib/ratelimit';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const comments = await prisma.comment.findMany({
    where: { videoId: params.id },
    orderBy: { createdAt: 'desc' }, take: 100,
    include: { user: { select: { username: true, avatarUrl: true } } }
  });
  return NextResponse.json({ comments });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Login to comment' }, { status: 401 });
  if (!rateLimit(`comment:${user.id}`, 8, 60000))
    return NextResponse.json({ error: 'Commenting too fast' }, { status: 429 });
  const body = commentSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: 'Comment must be 1-1000 characters' }, { status: 400 });
  const video = await prisma.video.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!video) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const [comment] = await prisma.$transaction([
    prisma.comment.create({ data: { body: body.data.body, videoId: video.id, userId: user.id }, include: { user: { select: { username: true, avatarUrl: true } } } }),
    prisma.video.update({ where: { id: video.id }, data: { commentsCount: { increment: 1 } } })
  ]);
  return NextResponse.json(comment, { status: 201 });
}
