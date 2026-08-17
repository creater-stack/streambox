import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { reportSchema } from '@/lib/validate';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Login to report' }, { status: 401 });
  const body = reportSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: 'Reason required (min 3 chars)' }, { status: 400 });
  const video = await prisma.video.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!video) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await prisma.report.create({ data: { videoId: video.id, userId: user.id, reason: body.data.reason } });
  return NextResponse.json({ ok: true }, { status: 201 });
}
