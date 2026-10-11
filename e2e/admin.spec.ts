import { expect, test } from '@playwright/test';

test.describe('Payload admin', () => {
  test('redirects anonymous visitors to an auth form', async ({ page }) => {
    await page.goto('/admin');

    // An empty database (CI) shows first-user signup; a seeded one shows login.
    await expect(page).toHaveURL(/\/admin\/(create-first-user|login)/, { timeout: 30000 });
    await expect(page.locator('input[name="email"]')).toBeVisible();
  });
});

test.describe('global not found', () => {
  test('unmatched routes render the site 404', async ({ page }) => {
    const response = await page.goto('/this-route-does-not-exist');

    expect(response?.status()).toBe(404);
    await expect(page.getByText('404 - Page Not Found')).toBeVisible();
  });
});
