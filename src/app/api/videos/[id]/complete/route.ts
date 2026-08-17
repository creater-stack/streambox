import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { enqueue } from '@/server/process';

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const video = await prisma.video.findUnique({ where: { id: params.id }, include: { upload: true } });
  if (!video || !video.upload) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (video.userId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (video.upload.offset < video.upload.size)
    return NextResponse.json({ error: 'Upload incomplete' }, { status: 409 });
  await prisma.upload.update({ where: { id: video.upload.id }, data: { status: 'COMPLETE' } });
  await prisma.video.update({ where: { id: video.id }, data: { status: 'PROCESSING' } });
  enqueue(video.id);
  return NextResponse.json({ ok: true, status: 'PROCESSING' });
}
