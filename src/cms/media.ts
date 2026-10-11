import type { Media } from 'src/payload-types';

export type MediaSize = keyof NonNullable<Media['sizes']>;

export type MediaSource = { src: string; width?: number; height?: number; alt: string };

/**
 * Picks the URL and intrinsic dimensions of one generated size, falling back to the
 * original when that size is missing (small originals skip larger sizes).
 * Returns null for unpopulated relations (an id instead of a document).
 */
export function mediaSource(media: Media | number | null | undefined, size: MediaSize = 'large'): MediaSource | null {
  if (!media || typeof media === 'number') return null;
  const sized = media.sizes?.[size];
  const picked = sized?.url ? sized : media;
  if (!picked.url) return null;
  return {
    src: picked.url,
    width: picked.width ?? undefined,
    height: picked.height ?? undefined,
    alt: media.alt,
  };
}
