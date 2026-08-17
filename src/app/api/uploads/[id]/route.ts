import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { num } from '@/lib/dto';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const up = await prisma.upload.findUnique({ where: { id: params.id }, include: { video: { select: { id: true } } } });
  if (!up || up.userId !== user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ offset: num(up.offset), size: num(up.size), status: up.status, videoId: up.video?.id ?? null });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const up = await prisma.upload.findUnique({ where: { id: params.id }, include: { video: true } });
  if (!up || up.userId !== user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (up.video && up.video.status !== 'UPLOADING')
    return NextResponse.json({ error: 'Upload already processing' }, { status: 409 });
  await fs.unlink(up.filePath).catch(() => {});
  if (up.video) await prisma.video.delete({ where: { id: up.video.id } });
  await prisma.upload.delete({ where: { id: up.id } });
  return NextResponse.json({ ok: true });
}
