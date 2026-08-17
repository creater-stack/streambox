import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { prisma } from '@/lib/db';
import { DIR } from '@/lib/paths';
import { syncDirToS3, s3Enabled } from '@/lib/s3';

const FFMPEG = process.env.FFMPEG_BIN || 'ffmpeg';
const FFPROBE = process.env.FFPROBE_BIN || 'ffprobe';
const SEG = Number(process.env.HLS_SEGMENT_SECONDS || 4);

const BW = {
  1080: Number(process.env.BW_1080 || 4500000),
  720: Number(process.env.BW_720 || 2800000),
  480: Number(process.env.BW_480 || 1400000),
  360: Number(process.env.BW_360 || 800000)
};
const LADDER = [
  { h: 1080, bw: BW[1080] },
  { h: 720, bw: BW[720] },
  { h: 480, bw: BW[480] },
  { h: 360, bw: BW[360] }
];

const queue: string[] = [];
let running = false;

export function enqueue(videoId: string) {
  if (!queue.includes(videoId)) queue.push(videoId);
  void drain();
}

async function drain() {
  if (running) return;
  running = true;
  while (queue.length) {
    const id = queue.shift()!;
    try { await processVideo(id); }
    catch (e: any) {
      console.error(`[process] ${id} failed:`, e?.message || e);
      await prisma.video.update({ where: { id }, data: { status: 'FAILED', failReason: String(e?.message || e).slice(0, 400) } }).catch(() => {});
    }
  }
  running = false;
}

export async function recoverStuck() {
  try {
    await fs.mkdir(DIR.hls, { recursive: true });
    await fs.mkdir(DIR.thumbs, { recursive: true });
    await fs.mkdir(DIR.originals, { recursive: true });
    await fs.mkdir(DIR.avatars, { recursive: true });
    const stuck = await prisma.video.findMany({ where: { status: 'PROCESSING' }, select: { id: true } });
    for (const v of stuck) enqueue(v.id);
    if (stuck.length) console.log(`[process] re-queued ${stuck.length} stuck video(s)`);
  } catch (e) { console.error('[process] recovery error', e); }
}

function run(bin: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const p = spawn(bin, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', d => (err += d.toString()));
    p.on('error', reject);
    p.on('close', code => code === 0 ? resolve() : reject(new Error(`${bin} exited ${code}: ${err.slice(-600)}`)));
  });
}

function probe(file: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const p = spawn(FFPROBE, ['-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', file]);
    let out = '';
    p.stdout.on('data', d => (out += d));
    p.on('error', () => reject(new Error('ffprobe not found — install FFmpeg')));
    p.on('close', code => code === 0 ? resolve(JSON.parse(out)) : reject(new Error('ffprobe failed')));
  });
}

async function processVideo(videoId: string) {
  const video = await prisma.video.findUnique({ where: { id: videoId }, include: { upload: true } });
  if (!video || !video.upload) throw new Error('video/upload row missing');
  await prisma.video.update({ where: { id: videoId }, data: { status: 'PROCESSING', failReason: null } });
  const input = video.upload.filePath;
  await fs.access(input);
  const info = await probe(input);
  const vStream = info.streams?.find((s: any) => s.codec_type === 'video');
  if (!vStream) throw new Error('No video stream found in file');
  const srcW = Number(vStream.width), srcH = Number(vStream.height);
  const duration = Number(info.format?.duration || 0);
  const outDir = path.join(DIR.hls, videoId);
  await fs.mkdir(outDir, { recursive: true });
  let renditions = LADDER.filter(r => r.h <= srcH);
  if (renditions.length === 0) renditions = [{ h: Math.floor(srcH / 2) * 2, bw: BW[360] }];
  for (const r of renditions) {
    const playlist = path.join(outDir, `${r.h}p.m3u8`);
    await run(FFMPEG, [
      '-y', '-i', input,
      '-vf', `scale=-2:${r.h}`,
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23',
      '-maxrate', `${Math.round(r.bw * 0.9)}`, '-bufsize', `${r.bw * 2}`,
      '-c:a', 'aac', '-b:a', '128k', '-ac', '2',
      '-r', '30',
      '-g', String(SEG * 2), '-keyint_min', String(SEG * 2), '-sc_threshold', '0',
      '-force_key_frames', `expr:gte(t,n_forced*${SEG})`,
      '-f', 'hls', '-hls_time', String(SEG), '-hls_playlist_type', 'vod',
      '-hls_flags', 'independent_segments',
      '-hls_segment_filename', path.join(outDir, `${r.h}p_%05d.ts`),
      playlist
    ]);
  }
  let master = '#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-INDEPENDENT-SEGMENTS\n';
  for (const r of renditions) {
    const w = Math.round((r.h * srcW / srcH) / 2) * 2;
    master += `#EXT-X-STREAM-INF:BANDWIDTH=${r.bw},RESOLUTION=${w}x${r.h},NAME="${r.h}p"\n${r.h}p.m3u8\n`;
  }
  await fs.writeFile(path.join(outDir, 'master.m3u8'), master);
  const thumbAt = Math.min(1.5, Math.max(0.2, duration * 0.25));
  const thumbRel = `thumbs/${videoId}.jpg`;
  await run(FFMPEG, ['-y', '-ss', String(thumbAt), '-i', input, '-frames:v', '1', '-vf', 'scale=640:-2', '-q:v', '3', path.join(DIR.thumbs, `${videoId}.jpg`)]);
  await prisma.videoStream.deleteMany({ where: { videoId } });
  await prisma.videoStream.createMany({
    data: renditions.map(r => ({ videoId, label: `${r.h}p`, height: r.h, bandwidth: r.bw, playlistPath: `hls/${videoId}/${r.h}p.m3u8` }))
  });
  await prisma.video.update({
    where: { id: videoId },
    data: { status: 'READY', duration, width: srcW, height: srcH, thumbPath: thumbRel, hlsPath: `hls/${videoId}`, publishedAt: new Date() }
  });
  if (s3Enabled()) {
    try { await syncDirToS3(outDir, `hls/${videoId}`); } catch (e) { console.error('[s3] sync failed', e); }
  }
  console.log(`[process] ${videoId} READY (${renditions.map(r => r.h + 'p').join(', ')})`);
}
