import fs from 'fs';
import path from 'path';
let s3: any = null;
export function s3Enabled() { return process.env.S3_ENABLED === 'true'; }
async function client() {
  if (!s3Enabled()) return null;
  const { S3Client } = await import('@aws-sdk/client-s3');
  s3 ??= new S3Client({
    region: process.env.S3_REGION || 'us-east-1',
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle: !!process.env.S3_ENDPOINT,
    credentials: { accessKeyId: process.env.S3_ACCESS_KEY || '', secretAccessKey: process.env.S3_SECRET_KEY || '' }
  });
  return s3;
}
export async function syncDirToS3(localDir: string, remotePrefix: string) {
  const c = await client();
  if (!c) return;
  const { PutObjectCommand } = await import('@aws-sdk/client-s3');
  const walk = (dir: string): string[] =>
    fs.readdirSync(dir).flatMap(f => {
      const p = path.join(dir, f);
      return fs.statSync(p).isDirectory() ? walk(p) : [p];
    });
  for (const file of walk(localDir)) {
    const key = `${remotePrefix}/${path.relative(localDir, file).split(path.sep).join('/')}`;
    await c.send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET, Key: key,
      Body: fs.createReadStream(file),
      ContentType: file.endsWith('.m3u8') ? 'application/vnd.apple.mpegurl' : file.endsWith('.ts') ? 'video/mp2t' : undefined
    }));
  }
  console.log(`[s3] synced ${localDir} -> s3://${process.env.S3_BUCKET}/${remotePrefix}`);
}
