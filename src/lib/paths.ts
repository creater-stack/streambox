import path from 'path';
export const STORAGE_ROOT = path.join(process.cwd(), 'storage');
export const DIR = {
  originals: path.join(STORAGE_ROOT, 'originals'),
  hls: path.join(STORAGE_ROOT, 'hls'),
  thumbs: path.join(STORAGE_ROOT, 'thumbs'),
  avatars: path.join(STORAGE_ROOT, 'avatars')
};
export function isSafePath(base: string, target: string): boolean {
  const rel = path.relative(base, target);
  return !!rel && !rel.startsWith('..') && !path.isAbsolute(rel);
}
