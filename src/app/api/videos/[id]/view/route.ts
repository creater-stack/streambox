import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { ipOf } from '@/lib/ratelimit';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const video = await prisma.video.findUnique({ where: { id: params.id }, select: { id: true, status: true } });
  if (!video || video.status !== 'READY') return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const session = await getSession();
  const ipHash = crypto.createHash('sha256').update(ipOf(req) + (process.env.JWT_SECRET || '')).digest('hex').slice(0, 16);
  await prisma.$transaction([
    prisma.view.create({ data: { videoId: video.id, userId: session?.id, ipHash } }),
    prisma.video.update({ where: { id: video.id }, data: { viewsCount: { increment: 1 } } })
  ]);
  return NextResponse.json({ ok: true });
}
