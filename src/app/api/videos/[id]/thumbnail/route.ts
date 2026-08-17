import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { IMAGE_TYPES } from '@/lib/validate';
import { DIR } from '@/lib/paths';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const video = await prisma.video.findUnique({ where: { id: params.id } });
  if (!video) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (video.userId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const file = (await req.formData()).get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'No file' }, { status: 400 });
  if (!IMAGE_TYPES.includes(file.type)) return NextResponse.json({ error: 'JPG, PNG or WEBP only' }, { status: 400 });
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: 'Max 5 MB' }, { status: 413 });
  const rel = `thumbs/${video.id}.jpg`;
  await fs.mkdir(DIR.thumbs, { recursive: true });
  await fs.writeFile(path.join(DIR.thumbs, `${video.id}.jpg`), Buffer.from(await file.arrayBuffer()));
  await prisma.video.update({ where: { id: video.id }, data: { thumbPath: rel } });
  return NextResponse.json({ thumbUrl: `/api/media/${rel}` });
}
