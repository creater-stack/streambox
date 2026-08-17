import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/guard';
export async function GET() {
  const { res } = await requireAdmin();
  if (res) return res;
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' }, take: 200,
    select: { id: true, username: true, email: true, role: true, suspended: true, createdAt: true, _count: { select: { videos: true } } }
  });
  return NextResponse.json({ users });
}
