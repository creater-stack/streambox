import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

const schema = z.object({ token: z.string().min(32), password: z.string().min(8).max(72) });

export async function POST(req: NextRequest) {
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  const row = await prisma.passwordResetToken.findUnique({ where: { token: body.data.token } });
  if (!row || row.used || row.expiresAt < new Date())
    return NextResponse.json({ error: 'Reset link is invalid or expired' }, { status: 400 });
  await prisma.$transaction([
    prisma.user.update({ where: { id: row.userId }, data: { passwordHash: await hashPassword(body.data.password) } }),
    prisma.passwordResetToken.update({ where: { id: row.id }, data: { used: true } })
  ]);
  return NextResponse.json({ ok: true });
}
