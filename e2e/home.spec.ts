import { expect, test } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('/');

  // Expect a title "to contain" a substring.
  // Adjust this based on the actual title of the home page.
  await expect(page).toHaveTitle(/Jaisal Friedman/);
});

test('navigation to blog page', async ({ page }) => {
  await page.goto('/');

  // Find a link with the test id "navbar-blog-link" and click it.
  await page.getByTestId('navbar-blog-link').first().click();

  // The new URL should contain "/blog".
  await expect(page).toHaveURL(/.*blog/);
});

test('navigation to about page', async ({ page }) => {
  await page.goto('/');

  // Find a link with the test id "navbar-about-link" and click it.
  await page.getByTestId('navbar-about-link').first().click();

  // The new URL should contain "/about".
  await expect(page).toHaveURL(/.*about/);

  // The about page should have a heading.
  await expect(page.getByTestId('about-heading')).toBeVisible();
});

test('footer is present on all pages', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('footer-copyright')).toBeVisible();

  await page.goto('/blog');
  await expect(page.getByTestId('footer-copyright')).toBeVisible();

  await page.goto('/about');
  await expect(page.getByTestId('footer-copyright')).toBeVisible();
});

test('mobile navigation menu works', async ({ page }) => {
  // Set viewport to mobile size
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/');

  // Click the mobile menu button
  await page.getByTestId('navbar-mobile-menu-button').click();

  // Check if "Collections" is visible in the mobile menu (Dialog)
  // Adjusted based on NavBar.tsx implementation
  await expect(
    page.getByTestId('mobile-menu-collections-heading'),
  ).toBeVisible();

  // Close the menu
  await page.getByTestId('navbar-mobile-close-button').click();
  await expect(
    page.getByTestId('mobile-menu-collections-heading'),
  ).not.toBeVisible();
});
