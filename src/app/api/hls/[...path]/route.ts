import { NextRequest } from 'next/server';
import { STORAGE_ROOT } from '@/lib/paths';
import { streamFile } from '@/lib/media';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  const rel = params.path.join('/');
  if (!rel.startsWith('hls/')) return new Response('Not found', { status: 404 });
  return streamFile(STORAGE_ROOT, rel, req.headers.get('range'));
}
