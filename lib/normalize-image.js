import convert from 'heic-convert';
import sharp from 'sharp';

const MAX_DIM = 2400;

// Converts HEIC to JPEG if needed, then downsizes so the image stays under
// Anthropic's 5MB / 8000px image limits and Vercel's 4.5MB response limit.
export async function normalizeImage(base64, mimeType) {
  let buf = Buffer.from(base64, 'base64');
  const isHeic = mimeType === 'image/heic' || mimeType === 'image/heif';
  if (isHeic) buf = Buffer.from(await convert({ buffer: buf, format: 'JPEG', quality: 0.9 }));

  const meta = await sharp(buf).metadata();
  const tooBig = Math.max(meta.width || 0, meta.height || 0) > MAX_DIM || buf.length > 3.5 * 1024 * 1024;
  if (!isHeic && !tooBig) return { image: base64, mimeType, converted: false };

  const out = await sharp(buf).rotate()
    .resize({ width: MAX_DIM, height: MAX_DIM, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 }).toBuffer();
  return { image: out.toString('base64'), mimeType: 'image/jpeg', converted: isHeic };
}
