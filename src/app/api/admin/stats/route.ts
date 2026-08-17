import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/guard';
export async function GET() {
  const { res } = await requireAdmin();
  if (res) return res;
  const [users, videos, ready, processing, failed, comments, views, openReports] = await Promise.all([
    prisma.user.count(),
    prisma.video.count(),
    prisma.video.count({ where: { status: 'READY' } }),
    prisma.video.count({ where: { status: { in: ['PROCESSING', 'UPLOADING'] } } }),
    prisma.video.count({ where: { status: 'FAILED' } }),
    prisma.comment.count(),
    prisma.view.count(),
    prisma.report.count({ where: { status: 'OPEN' } })
  ]);
  return NextResponse.json({ users, videos, ready, processing, failed, comments, views, openReports });
}
