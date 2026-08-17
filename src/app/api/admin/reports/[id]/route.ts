import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/guard';
const schema = z.object({ status: z.enum(['RESOLVED', 'DISMISSED']) });
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { res } = await requireAdmin();
  if (res) return res;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  const report = await prisma.report.update({ where: { id: params.id }, data: { status: body.data.status } });
  return NextResponse.json(report);
}
