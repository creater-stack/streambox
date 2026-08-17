import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { prisma } from './db';
export const COOKIE = 'sb_token';
const secret = () => {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET is not set');
  return s;
};
export const hashPassword = (pw: string) => bcrypt.hash(pw, 12);
export const checkPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);
export function signToken(userId: string, role: string) {
  return jwt.sign({ sub: userId, role }, secret(), { expiresIn: '7d' });
}
export function verifyToken(token: string) {
  try { return jwt.verify(token, secret()) as { sub: string; role: string }; }
  catch { return null; }
}
export async function getSession() {
  const c = cookies().get(COOKIE);
  if (!c) return null;
  const payload = verifyToken(c.value);
  if (!payload) return null;
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || user.suspended) return null;
  return user;
}
