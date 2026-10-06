import { expect, test } from '@playwright/test';
import sharp from 'sharp';

import { signIn } from './support/admin';

type MediaDoc = { id: number; url: string; sizes: Record<string, { url?: string | null }> };

test('admin upload goes browser to Blob storage and generates sizes', async ({ page }) => {
  await signIn(page);

  const alt = `e2e upload ${Date.now()}`;
  const image = await sharp({ create: { width: 1800, height: 1200, channels: 3, background: '#3a7d44' } })
    .jpeg()
    .toBuffer();

  await page.goto('/admin/collections/media/create');
  await page
    .locator('input[type="file"]')
    .setInputFiles({ name: 'e2e-upload.jpg', mimeType: 'image/jpeg', buffer: image });
  await page.locator('input[name="alt"]').fill(alt);
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page).toHaveURL(/\/admin\/collections\/media\/\d+/, { timeout: 30000 });

  const found = await page.request.get(`/api/media?where[alt][equals]=${encodeURIComponent(alt)}&depth=0`);
  const [doc] = ((await found.json()) as { docs: MediaDoc[] }).docs;
  expect(doc, 'uploaded media document').toBeTruthy();

  // With a Blob token set, files are served from Blob (the emulator locally and in
  // CI), not from Payload's own /api/media/file route.
  expect(doc.url).not.toContain('/api/media/file/');
  for (const url of [doc.url, doc.sizes.thumbnail?.url, doc.sizes.large?.url]) {
    expect(url, 'stored URL').toBeTruthy();
    expect((await page.request.get(url!)).status(), url!).toBe(200);
  }

  await page.request.delete(`/api/media/${doc.id}`);
});
