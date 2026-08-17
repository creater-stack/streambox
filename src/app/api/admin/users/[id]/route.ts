import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/guard';
const schema = z.object({ suspended: z.boolean().optional() });
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { user: admin, res } = await requireAdmin();
  if (res) return res;
  if (params.id === admin!.id) return NextResponse.json({ error: 'Cannot modify yourself' }, { status: 400 });
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: 'Invalid' }, { status: 400 });
  const user = await prisma.user.update({ where: { id: params.id }, data: { suspended: body.data.suspended }, select: { id: true, suspended: true } });
  return NextResponse.json(user);
}
