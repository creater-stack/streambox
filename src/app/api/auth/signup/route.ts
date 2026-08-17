import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashPassword, signToken, COOKIE } from '@/lib/auth';
import { signupSchema } from '@/lib/validate';
import { rateLimit, ipOf } from '@/lib/ratelimit';

export async function POST(req: NextRequest) {
  if (!rateLimit(`signup:${ipOf(req)}`, 5, 60000))
    return NextResponse.json({ error: 'Too many attempts, slow down' }, { status: 429 });
  const body = signupSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: body.error.issues[0].message }, { status: 400 });
  const { username, email, password } = body.data;
  const exists = await prisma.user.findFirst({ where: { OR: [{ email }, { username }] } });
  if (exists) return NextResponse.json({ error: exists.email === email ? 'Email already registered' : 'Username taken' }, { status: 409 });
  const user = await prisma.user.create({ data: { username, email, passwordHash: await hashPassword(password) } });
  const res = NextResponse.json({ id: user.id, username: user.username, role: user.role });
  res.cookies.set(COOKIE, signToken(user.id, user.role), { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 7 });
  return res;
}
