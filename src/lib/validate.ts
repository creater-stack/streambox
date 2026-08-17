import { z } from 'zod';
export const signupSchema = z.object({
  username: z.string().min(3).max(24).regex(/^[a-zA-Z0-9_]+$/, 'letters, numbers, underscore only'),
  email: z.string().email(),
  password: z.string().min(8, 'min 8 characters').max(72)
});
export const loginSchema = z.object({ email: z.string(), password: z.string() });
export const videoMetaSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().max(5000).optional().nullable(),
  categoryId: z.string().optional().nullable(),
  tags: z.array(z.string().min(1).max(24)).max(10).optional()
});
export const uploadInitSchema = videoMetaSchema.extend({
  filename: z.string().min(1).max(255),
  size: z.number().int().positive(),
  mimetype: z.string()
});
export const commentSchema = z.object({ body: z.string().min(1).max(1000) });
export const reportSchema = z.object({ reason: z.string().min(3).max(500) });
export const VIDEO_TYPES = ['video/mp4','video/webm','video/quicktime','video/x-matroska','video/x-msvideo','video/ogg'];
export const IMAGE_TYPES = ['image/jpeg','image/png','image/webp'];
export const maxUploadBytes = () => Number(process.env.MAX_UPLOAD_BYTES || 5 * 1024 ** 3);
