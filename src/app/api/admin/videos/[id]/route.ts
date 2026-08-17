import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/guard';
import { STORAGE_ROOT } from '@/lib/paths';
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { res } = await requireAdmin();
  if (res) return res;
  const video = await prisma.video.findUnique({ where: { id: params.id }, include: { upload: true } });
  if (!video) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (video.hlsPath) await fs.rm(path.join(STORAGE_ROOT, video.hlsPath), { recursive: true, force: true }).catch(() => {});
  if (video.thumbPath) await fs.unlink(path.join(STORAGE_ROOT, video.thumbPath)).catch(() => {});
  if (video.upload?.filePath) await fs.unlink(video.upload.filePath).catch(() => {});
  await prisma.video.delete({ where: { id: video.id } });
  if (video.uploadId) await prisma.upload.delete({ where: { id: video.uploadId } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
