import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { IMAGE_TYPES } from '@/lib/validate';
import { DIR } from '@/lib/paths';

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'No file' }, { status: 400 });
  if (!IMAGE_TYPES.includes(file.type)) return NextResponse.json({ error: 'JPG, PNG or WEBP only' }, { status: 400 });
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: 'Max 5 MB' }, { status: 413 });
  const ext = file.type.split('/')[1];
  const rel = `avatars/${user.id}.${ext}`;
  await fs.mkdir(DIR.avatars, { recursive: true });
  await fs.writeFile(path.join(DIR.avatars, `${user.id}.${ext}`), Buffer.from(await file.arrayBuffer()));
  await prisma.user.update({ where: { id: user.id }, data: { avatarUrl: rel } });
  return NextResponse.json({ avatarUrl: `/api/media/${rel}` });
}
