import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { isSafePath } from './paths';
const MIME: Record<string, string> = {
  '.m3u8': 'application/vnd.apple.mpegurl',
  '.ts': 'video/mp2t',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp'
};
export function streamFile(baseDir: string, relPath: string, rangeHeader: string | null) {
  const full = path.join(baseDir, relPath);
  if (!isSafePath(baseDir, full) || !fs.existsSync(full) || !fs.statSync(full).isFile()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const size = fs.statSync(full).size;
  const ext = path.extname(full).toLowerCase();
  const type = MIME[ext] || 'application/octet-stream';
  const range = rangeHeader?.match(/bytes=(\d*)-(\d*)/);
  if (range && (range[1] || range[2])) {
    const start = range[1] ? parseInt(range[1], 10) : 0;
    const end = range[2] ? Math.min(parseInt(range[2], 10), size - 1) : size - 1;
    if (start >= size || end >= size || start > end) {
      return new NextResponse(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
    }
    const stream = fs.createReadStream(full, { start, end });
    return new NextResponse(stream as any, {
      status: 206,
      headers: {
        'Content-Range': `bytes ${start}-${end}/${size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': String(end - start + 1),
        'Content-Type': type,
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    });
  }
  const stream = fs.createReadStream(full);
  return new NextResponse(stream as any, {
    status: 200,
    headers: {
      'Content-Length': String(size),
      'Content-Type': type,
      'Accept-Ranges': 'bytes',
      'Cache-Control': ext === '.m3u8' ? 'public, max-age=2' : 'public, max-age=31536000, immutable'
    }
  });
}
