import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { videoMetaSchema } from '@/lib/validate';
import { videoDTO } from '@/lib/dto';
import { STORAGE_ROOT } from '@/lib/paths';

const include = { user: { select: { id: true, username: true, avatarUrl: true, bio: true } }, category: true, tags: { include: { tag: true } }, streams: true };

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const video = await prisma.video.findUnique({ where: { id: params.id }, include });
  if (!video) return NextResponse.json({ error: 'Video not found' }, { status: 404 });
  const session = await getSession();
  const liked = session ? !!(await prisma.like.findUnique({ where: { videoId_userId: { videoId: video.id, userId: session.id } } })) : false;
  return NextResponse.json({ ...videoDTO(video), liked, isOwner: session?.id === video.userId });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const video = await prisma.video.findUnique({ where: { id: params.id } });
  if (!video) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (video.userId !== user.id) return NextResponse.json({ error: 'You can only edit your own videos' }, { status: 403 });
  const body = videoMetaSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: body.error.issues[0].message }, { status: 400 });
  const { title, description, categoryId, tags } = body.data;
  await prisma.videoTag.deleteMany({ where: { videoId: video.id } });
  if (tags?.length) {
    for (const t of tags.slice(0, 10)) {
      const name = t.trim().toLowerCase();
      if (!name) continue;
      const tag = await prisma.tag.upsert({ where: { name }, update: {}, create: { name } });
      await prisma.videoTag.create({ data: { videoId: video.id, tagId: tag.id } }).catch(() => {});
    }
  }
  const updated = await prisma.video.update({
    where: { id: video.id },
    data: { title, description: description || null, categoryId: categoryId || null },
    include: { user: { select: { username: true, avatarUrl: true } }, category: true, tags: { include: { tag: true } } }
  });
  return NextResponse.json(videoDTO(updated));
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const video = await prisma.video.findUnique({ where: { id: params.id }, include: { upload: true } });
  if (!video) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (video.userId !== user.id && user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (video.hlsPath) await fs.rm(path.join(STORAGE_ROOT, video.hlsPath), { recursive: true, force: true }).catch(() => {});
  if (video.thumbPath) await fs.unlink(path.join(STORAGE_ROOT, video.thumbPath)).catch(() => {});
  if (video.upload?.filePath) await fs.unlink(video.upload.filePath).catch(() => {});
  await prisma.video.delete({ where: { id: video.id } });
  if (video.uploadId) await prisma.upload.delete({ where: { id: video.uploadId } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
