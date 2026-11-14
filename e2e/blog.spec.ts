import { expect, test } from '@playwright/test';

// The first two tests follow whatever posts exist (seeded in CI, migrated locally).

test('blog index lists posts from Payload', async ({ page }) => {
  await page.goto('/blog');
  await expect(page.getByTestId('blog-row').first()).toBeVisible();
});

test('a post opens from the index and renders its body', async ({ page }) => {
  await page.goto('/blog');
  const href = await page.getByTestId('blog-row').first().getAttribute('href');
  expect(href).toMatch(/^\/blog\//);

  const response = await page.goto(href!);
  expect(response?.status()).toBe(200);
  await expect(page.getByTestId('post-heading')).toBeVisible();
  await expect(page.locator('main article p').first()).toBeVisible();
});

test('the seeded post renders every rich text node type', async ({ page }) => {
  const response = await page.goto('/blog/seed-post');
  test.skip(response?.status() === 404, 'no seed content: this database holds migrated posts');

  const article = page.locator('main article');
  await expect(article.locator('h2').first()).toBeVisible();
  await expect(article.locator('figure[data-code] pre code').first()).toBeVisible();
  await expect(article.locator('a[target="_blank"]').first()).toHaveAttribute('rel', 'noreferrer');
  await expect(article.locator('li').first()).toBeVisible();
});

test('unknown post slugs return 404', async ({ page }) => {
  const response = await page.goto('/blog/this-post-does-not-exist');
  expect(response?.status()).toBe(404);
});
