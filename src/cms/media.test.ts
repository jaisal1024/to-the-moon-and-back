import type { Media } from 'src/payload-types';
import { describe, expect, it } from 'vitest';

import { mediaSource } from './media';

const media = (overrides: Partial<Media> = {}): Media =>
  ({
    id: 1,
    alt: 'Two surfers',
    url: 'https://blob.example/original.jpg',
    width: 6000,
    height: 3376,
    sizes: {
      card: { url: 'https://blob.example/card.jpg', width: 800, height: 450 },
      large: { url: 'https://blob.example/large.jpg', width: 1600, height: 900 },
    },
    updatedAt: '',
    createdAt: '',
    ...overrides,
  }) as Media;

describe('mediaSource', () => {
  it('uses the requested size', () => {
    expect(mediaSource(media(), 'card')).toEqual({
      src: 'https://blob.example/card.jpg',
      width: 800,
      height: 450,
      alt: 'Two surfers',
    });
  });

  it('defaults to the large size', () => {
    expect(mediaSource(media())?.src).toBe('https://blob.example/large.jpg');
  });

  it('falls back to the original when the size was not generated', () => {
    expect(mediaSource(media(), 'xl')).toMatchObject({ src: 'https://blob.example/original.jpg', width: 6000 });
  });

  it('returns null for unpopulated relations and missing media', () => {
    expect(mediaSource(42)).toBeNull();
    expect(mediaSource(null)).toBeNull();
    expect(mediaSource(media({ url: null, sizes: {} }))).toBeNull();
  });
});
