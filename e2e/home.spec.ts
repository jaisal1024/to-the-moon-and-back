import { expect, test } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Jaisal Friedman/);
  await expect(page.getByTestId('collections-heading')).toBeVisible();
});

test('navigation to blog page', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('nav-blog').click();

  await expect(page).toHaveURL(/.*blog/);
  await expect(page.getByTestId('blog-heading')).toBeVisible();
  await expect(page.getByTestId('nav-blog')).toHaveAttribute('aria-current', 'page');
});

test('navigation to about page', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('nav-about').click();

  await expect(page).toHaveURL(/.*about/);
  await expect(page.getByTestId('about-heading')).toBeVisible();
});

test('navigation back home from the name', async ({ page }) => {
  await page.goto('/about');
  await page.getByTestId('nav-home').click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId('nav-collections')).toHaveAttribute('aria-current', 'page');
});

test('footer is present on all pages', async ({ page }) => {
  for (const path of ['/', '/blog', '/about']) {
    await page.goto(path);
    await expect(page.getByTestId('footer-copyright')).toBeVisible();
  }
});

test('unknown pages show the not found page', async ({ page }) => {
  const response = await page.goto('/this-page-does-not-exist');
  expect(response?.status()).toBe(404);
  await expect(page.getByTestId('not-found-heading')).toBeVisible();
});

test('top bar steps aside while scrolling down and returns on scroll up', async ({ page }) => {
  await page.goto('/about');
  const bar = page.getByRole('banner');
  await expect(bar).toBeInViewport();

  // Scroll programmatically (mobile WebKit has no mouse wheel), and keep scrolling until the
  // client scroll handler has hydrated and reacted, so a slow hydration can't make this flaky.
  await expect(async () => {
    await page.evaluate(() => window.scrollBy(0, 400));
    await expect(bar).not.toBeInViewport({ timeout: 500 });
  }).toPass();

  await page.evaluate(() => window.scrollBy(0, -400));
  await expect(bar).toBeInViewport();
});
