import sharp from 'sharp'

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024 // 5 MB
const COMPRESSIBLE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

export function isCompressibleImage(contentType: string): boolean {
  return COMPRESSIBLE_TYPES.has(contentType)
}

/**
 * If a file is over the size limit and is an image type sharp can handle,
 * re-encode it (progressively lower quality, then downscale) until it fits.
 * Returns the original bytes untouched if it's already under the limit, or if
 * it isn't a compressible image type (caller should reject those outright).
 */
export async function compressImageToLimit(
  buffer: Buffer,
  contentType: string,
  maxBytes: number = MAX_UPLOAD_BYTES,
): Promise<{ buffer: Buffer; contentType: string }> {
  if (buffer.byteLength <= maxBytes || !isCompressibleImage(contentType)) {
    return { buffer, contentType }
  }

  // Re-encode as JPEG (best size/quality tradeoff for photos of receipts),
  // stepping quality down and, if still too big, downscaling dimensions.
  let quality = 82
  let width: number | undefined
  for (let attempt = 0; attempt < 8; attempt++) {
    const pipeline = sharp(buffer).rotate() // .rotate() bakes in EXIF orientation
    if (width) pipeline.resize({ width, withoutEnlargement: true })
    const out = await pipeline.jpeg({ quality, mozjpeg: true }).toBuffer()
    if (out.byteLength <= maxBytes) {
      return { buffer: out, contentType: 'image/jpeg' }
    }
    // Alternate between dropping quality and shrinking dimensions.
    if (quality > 40) {
      quality -= 12
    } else {
      const meta = await sharp(buffer).metadata()
      width = Math.round((width ?? meta.width ?? 1600) * 0.75)
    }
  }

  // Last resort — return the most-compressed attempt even if still over,
  // the caller enforces the hard limit and will reject with a clear message.
  const last = await sharp(buffer).rotate().resize({ width: 800, withoutEnlargement: true }).jpeg({ quality: 40, mozjpeg: true }).toBuffer()
  return { buffer: last, contentType: 'image/jpeg' }
}
