import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/mail';
import { rateLimit, ipOf } from '@/lib/ratelimit';

export async function POST(req: NextRequest) {
  if (!rateLimit(`forgot:${ipOf(req)}`, 3, 60000))
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  const { email } = await req.json().catch(() => ({}));
  const always = NextResponse.json({ ok: true, message: 'If that email exists, a reset link was sent.' });
  if (typeof email !== 'string' || !email.includes('@')) return always;
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) return always;
  const token = crypto.randomBytes(32).toString('hex');
  await prisma.passwordResetToken.create({ data: { userId: user.id, token, expiresAt: new Date(Date.now() + 3600000) } });
  const link = `${process.env.PUBLIC_URL || 'http://localhost:3000'}/reset?token=${token}`;
  await sendEmail(user.email, 'Reset your StreamBox password',
    `<p>Reset your StreamBox password (valid 1 hour):</p><p><a href="${link}">${link}</a></p>`, link);
  return always;
}
