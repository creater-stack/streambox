import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/guard';
export async function GET() {
  const { res } = await requireAdmin();
  if (res) return res;
  const reports = await prisma.report.findMany({
    orderBy: { createdAt: 'desc' }, take: 100,
    include: { video: { select: { id: true, title: true, status: true } }, user: { select: { username: true } } }
  });
  return NextResponse.json({ reports });
}
