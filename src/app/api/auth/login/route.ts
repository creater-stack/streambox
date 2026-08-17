import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { checkPassword, signToken, COOKIE } from '@/lib/auth';
import { loginSchema } from '@/lib/validate';
import { rateLimit, ipOf } from '@/lib/ratelimit';

export async function POST(req: NextRequest) {
  if (!rateLimit(`login:${ipOf(req)}`, 10, 60000))
    return NextResponse.json({ error: 'Too many attempts. Try again in a minute.' }, { status: 429 });
  const body = loginSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
  const user = await prisma.user.findUnique({ where: { email: body.data.email.toLowerCase() } });
  const ok = user && await checkPassword(body.data.password, user.passwordHash);
  if (!ok || !user) return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
  if (user.suspended) return NextResponse.json({ error: 'This account is suspended' }, { status: 403 });
  const res = NextResponse.json({ id: user.id, username: user.username, role: user.role });
  res.cookies.set(COOKIE, signToken(user.id, user.role), { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 7 });
  return res;
}
