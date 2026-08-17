import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  return NextResponse.json({ id: user.id, username: user.username, email: user.email, bio: user.bio, role: user.role, avatarUrl: user.avatarUrl ? `/api/media/${user.avatarUrl}` : null });
}

const patchSchema = z.object({ username: z.string().min(3).max(24).regex(/^[a-zA-Z0-9_]+$/).optional(), bio: z.string().max(300).optional() });

export async function PATCH(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const body = patchSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: body.error.issues[0].message }, { status: 400 });
  try {
    const updated = await prisma.user.update({ where: { id: user.id }, data: body.data });
    return NextResponse.json({ username: updated.username, bio: updated.bio });
  } catch { return NextResponse.json({ error: 'Username taken' }, { status: 409 }); }
}
