import { expect, type Locator, test } from '@playwright/test';

// Works against seeded (CI) or migrated (local) content: it follows whatever
// collections the homepage lists instead of hardcoding slugs.

async function expectImagesLoaded(images: Locator) {
  await expect(images.first()).toBeVisible();
  await expect
    .poll(() => images.first().evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0))
    .toBe(true);
}

test('homepage shows collection covers from Payload', async ({ page }) => {
  await page.goto('/');

  const covers = page.locator('main a[href^="/collections/"]');
  await expect(covers.first()).toBeVisible();
  await expectImagesLoaded(page.locator('main img'));
});

test('a collection page renders its title and photos', async ({ page }) => {
  await page.goto('/');
  const href = await page.locator('main a[href^="/collections/"]').first().getAttribute('href');
  expect(href).toBeTruthy();

  const response = await page.goto(href!);
  expect(response?.status()).toBe(200);
  await expect(page.locator('main h1')).toBeVisible();
  await expectImagesLoaded(page.locator('main img'));
});

test('unknown collection slugs return 404', async ({ page }) => {
  const response = await page.goto('/collections/this-collection-does-not-exist');
  expect(response?.status()).toBe(404);
});

test('the about page lists collections', async ({ page }) => {
  await page.goto('/about');
  await expect(page.locator('a[href^="/collections/"]').first()).toBeAttached();
});

test('photos ship a blur placeholder in the server HTML', async ({ request }) => {
  // next/image inlines the stored placeholder, so a preview paints before the photo downloads.
  const html = await (await request.get('/')).text();
  expect(html).toContain('data:image/webp;base64,');
});
