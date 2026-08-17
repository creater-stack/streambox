import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { num } from '@/lib/dto';

export const runtime = 'nodejs';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const up = await prisma.upload.findUnique({ where: { id: params.id } });
  if (!up || up.userId !== user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (up.status !== 'UPLOADING')
    return NextResponse.json({ error: 'Upload already finished' }, { status: 409 });
  const offsetHeader = Number(req.headers.get('upload-offset'));
  if (!Number.isFinite(offsetHeader) || BigInt(offsetHeader) !== up.offset)
    return NextResponse.json({ error: 'Offset mismatch', offset: num(up.offset) }, { status: 409 });
  const buf = Buffer.from(await req.arrayBuffer());
  if (up.offset + BigInt(buf.length) > up.size)
    return NextResponse.json({ error: 'Chunk exceeds declared size' }, { status: 400 });
  const fh = await fs.open(up.filePath, 'r+');
  try { await fh.write(buf, 0, buf.length, num(up.offset)); }
  finally { await fh.close(); }
  const newOffset = up.offset + BigInt(buf.length);
  const done = newOffset >= up.size;
  await prisma.upload.update({ where: { id: up.id }, data: { offset: newOffset, status: done ? 'UPLOADED' : 'UPLOADING' } });
  return NextResponse.json({ offset: num(newOffset), complete: done });
}
