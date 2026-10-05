import { expect, test } from '@playwright/test';

test('theme overrides hydrate and keep Tailwind utilities working', async ({ page }) => {
  const hydrationErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' && /hydrat|didn't match/i.test(message.text())) {
      hydrationErrors.push(message.text());
    }
  });

  await page.goto('/about?theme=dark', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(36, 36, 36)');
  await page.setViewportSize({ width: 375, height: 667 });
  await expect(page.getByTestId('navbar-mobile-menu-button')).toBeVisible();
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(page.getByTestId('navbar-mobile-menu-button')).toBeHidden();

  await page.goto('/about?theme=light', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  expect(hydrationErrors).toEqual([]);
});

test('theme follows system preference changes', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/about', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});
