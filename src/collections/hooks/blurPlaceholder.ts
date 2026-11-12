import type { CollectionBeforeChangeHook } from 'payload';
import sharp from 'sharp';

/** Longest edge of the placeholder. next/image scales and blurs it, so a few pixels are enough. */
const PLACEHOLDER_SIZE = 16;

/**
 * A tiny WebP of the image as a data URL (roughly 100 to 300 bytes), for
 * next/image's `placeholder="blur"`. It is inlined in the page HTML, so the
 * blurred preview paints before any request for the real photo.
 */
export async function blurDataUrlFrom(image: Buffer | string): Promise<string> {
  const placeholder = await sharp(image)
    .rotate() // apply EXIF orientation, which the resize would otherwise drop
    .resize(PLACEHOLDER_SIZE, PLACEHOLDER_SIZE, { fit: 'inside' })
    .webp({ quality: 40 })
    .toBuffer();
  return `data:image/webp;base64,${placeholder.toString('base64')}`;
}

/** Stores a blur placeholder whenever a file is uploaded or replaced. */
export const generateBlurPlaceholder: CollectionBeforeChangeHook = async ({ data, req }) => {
  const file = req.file;
  const image = file?.data?.length ? file.data : file?.tempFilePath;
  if (!image) return data;
  try {
    return { ...data, blurDataUrl: await blurDataUrlFrom(image) };
  } catch (err) {
    // An image sharp cannot read still uploads; it just loads without a placeholder.
    req.payload.logger.warn({ err }, `Could not generate a blur placeholder for ${file?.name}`);
    return { ...data, blurDataUrl: null };
  }
};
