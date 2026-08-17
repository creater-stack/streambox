import { NextResponse } from 'next/server';
import { getSession } from './auth';
import type { User } from '@prisma/client';
export async function requireUser(): Promise<{ user?: User; res?: NextResponse }> {
  const user = await getSession();
  if (!user) return { res: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) };
  return { user };
}
export async function requireAdmin(): Promise<{ user?: User; res?: NextResponse }> {
  const { user, res } = await requireUser();
  if (res) return { res };
  if (user!.role !== 'ADMIN') return { res: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  return { user };
}
