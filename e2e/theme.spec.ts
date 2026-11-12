import { expect, test } from '@playwright/test';

test('theme overrides hydrate and recolour the page surface', async ({ page }) => {
  const hydrationErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' && /hydrat|didn't match/i.test(message.text())) {
      hydrationErrors.push(message.text());
    }
  });

  await page.goto('/about?theme=dark', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  // The canvas behind the page matches its surface, so bouncing past the top shows no other colour.
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(36, 36, 36)');
  await expect(page.locator('html')).toHaveCSS('background-color', 'rgb(36, 36, 36)');
  // The page surface follows the theme: cream in light, carbon in dark.
  const surface = page.locator('main').locator('..');
  await expect(surface).toHaveCSS('background-color', 'rgb(36, 36, 36)');

  await page.goto('/about?theme=light', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(249, 244, 236)');
  await expect(page.locator('html')).toHaveCSS('background-color', 'rgb(249, 244, 236)');
  await expect(surface).toHaveCSS('background-color', 'rgb(249, 244, 236)');
  expect(hydrationErrors).toEqual([]);
});

test('theme follows system preference changes', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/about', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});
