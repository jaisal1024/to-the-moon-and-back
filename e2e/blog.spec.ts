import { expect, test } from '@playwright/test';

// Follows whatever posts exist (seeded in CI, migrated locally).

test('blog index lists posts from Payload', async ({ page }) => {
  await page.goto('/blog');
  await expect(page.locator('main article a[href^="/blog/"]').first()).toBeVisible();
});

test('a post renders its rich text body', async ({ page }) => {
  await page.goto('/blog');
  const href = await page.locator('main article a[href^="/blog/"]').first().getAttribute('href');
  expect(href).toBeTruthy();

  const response = await page.goto(href!);
  expect(response?.status()).toBe(200);

  const article = page.locator('main article');
  await expect(article.locator('h1')).toBeVisible();
  await expect(article.locator('h2').first()).toBeVisible();
  // Code blocks render through the syntax highlighter; external links open in a new tab.
  await expect(article.locator('figure pre code').first()).toBeVisible();
  await expect(article.locator('a[target="_blank"]').first()).toHaveAttribute('rel', 'noopener noreferrer');
  await expect(article.locator('li').first()).toBeVisible();
});

test('unknown post slugs return 404', async ({ page }) => {
  const response = await page.goto('/blog/this-post-does-not-exist');
  expect(response?.status()).toBe(404);
});
