import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { uploadInitSchema, VIDEO_TYPES, maxUploadBytes } from '@/lib/validate';
import { DIR } from '@/lib/paths';

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Login required to upload' }, { status: 401 });
  const body = uploadInitSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: body.error.issues[0].message }, { status: 400 });
  const { filename, size, mimetype, title, description, categoryId, tags } = body.data;
  const ext = path.extname(filename).toLowerCase();
  if (!VIDEO_TYPES.includes(mimetype) || !['.mp4', '.webm', '.mov', '.mkv', '.avi', '.ogv'].includes(ext))
    return NextResponse.json({ error: 'Unsupported video type. Use MP4, WEBM, MOV, MKV or AVI.' }, { status: 400 });
  if (size > maxUploadBytes())
    return NextResponse.json({ error: 'File exceeds the size limit' }, { status: 413 });
  const uploadId = crypto.randomBytes(12).toString('hex');
  const filePath = path.join(DIR.originals, `${uploadId}${ext}`);
  await fs.mkdir(DIR.originals, { recursive: true });
  await fs.writeFile(filePath, '');
  await prisma.upload.create({ data: { id: uploadId, userId: user.id, filename, mimetype, size: BigInt(size), filePath, status: 'UPLOADING' } });
  const video = await prisma.video.create({ data: { title, description: description || null, userId: user.id, categoryId: categoryId || null, uploadId } });
  if (tags?.length) {
    for (const t of tags.slice(0, 10)) {
      const name = t.trim().toLowerCase();
      if (!name) continue;
      const tag = await prisma.tag.upsert({ where: { name }, update: {}, create: { name } });
      await prisma.videoTag.create({ data: { videoId: video.id, tagId: tag.id } }).catch(() => {});
    }
  }
  return NextResponse.json({ uploadId, videoId: video.id, offset: 0 });
}
