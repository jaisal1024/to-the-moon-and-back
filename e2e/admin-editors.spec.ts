import { expect, test } from '@playwright/test';

import { signIn } from './support/admin';

test.describe('Payload admin editors', () => {
  test('post editor loads Lexical with the code block', async ({ page }) => {
    await signIn(page);
    await page.goto('/admin/collections/posts/create');

    await expect(page.locator('[data-lexical-editor="true"]')).toBeVisible({ timeout: 30000 });
    await expect(page.locator('input[name="title"]')).toBeVisible();
  });

  test('collection editor shows the photos array', async ({ page }) => {
    await signIn(page);
    await page.goto('/admin/collections/collections/create');

    await expect(page.locator('input[name="title"]')).toBeVisible({ timeout: 30000 });
    await expect(page.getByText('Photos').first()).toBeVisible();
  });
});
