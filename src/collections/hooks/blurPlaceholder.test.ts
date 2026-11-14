import type { PayloadRequest } from 'payload';
import sharp from 'sharp';
import { describe, expect, it, vi } from 'vitest';

import { blurDataUrlFrom, generateBlurPlaceholder } from './blurPlaceholder';

const photo = (width: number, height: number) =>
  sharp({ create: { width, height, channels: 3, background: '#3a7d44' } })
    .jpeg()
    .toBuffer();

const warn = vi.fn();
const run = (file: unknown, data: Record<string, unknown> = { alt: 'a' }) =>
  generateBlurPlaceholder({ data, req: { file, payload: { logger: { warn } } } as unknown as PayloadRequest } as never);

describe('blurDataUrlFrom', () => {
  it('returns a tiny WebP data URL that keeps the aspect ratio', async () => {
    const url = await blurDataUrlFrom(await photo(2400, 1600));
    expect(url).toMatch(/^data:image\/webp;base64,/);
    expect(url.length).toBeLessThan(600);
    const { width, height } = await sharp(Buffer.from(url.split(',')[1]!, 'base64')).metadata();
    expect([width, height]).toEqual([16, 11]);
  });
});

describe('generateBlurPlaceholder', () => {
  it('adds a placeholder when a file is uploaded', async () => {
    const data = await run({ name: 'a.jpg', data: await photo(800, 600) });
    expect(data).toMatchObject({ alt: 'a', blurDataUrl: expect.stringMatching(/^data:image\/webp;base64,/) });
  });

  it('leaves the stored placeholder alone when only fields change', async () => {
    const data = { alt: 'new alt' };
    expect(await run(undefined, data)).toBe(data);
  });

  it('clears the placeholder instead of failing the upload when the file is unreadable', async () => {
    const data = await run({ name: 'broken.jpg', data: Buffer.from('not an image') });
    expect(data).toMatchObject({ alt: 'a', blurDataUrl: null });
    expect(warn).toHaveBeenCalled();
  });
});
