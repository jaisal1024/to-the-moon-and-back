import { expect, test } from '@playwright/test';

test.describe('Sanity Studio', () => {
  test('should load the studio login page', async ({ page }) => {
    // Navigate to the studio path
    await page.goto('/studio');

    // Wait for the studio to initialize.
    // We check for the presence of "Choose a login provider" or similar text
    // which indicates the Studio has successfully loaded its JS bundle and rendered.
    // Sanity Studio usually has a "Sign in" or "Choose a login provider" heading.

    // Increased timeout as Studio can be heavy to load initially
    await page.waitForSelector('text=Choose login provider', {
      timeout: 30000,
    });

    await expect(page.getByText('Choose login provider')).toBeVisible();
  });
});
