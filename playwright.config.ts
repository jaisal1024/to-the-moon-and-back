import { defineConfig, devices } from '@playwright/test';
/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
import * as dotenv from 'dotenv';
import * as path from 'path';

// Set environment variables for E2E tests
// Keep browser tests independent of analytics requests.
process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID = '';
process.env.REVALIDATE_SECRET = 'super-not-secret-revalidate';
dotenv.config({ path: path.resolve(import.meta.dirname, '.env') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* CI serves a production build, so every runner core can drive a browser. */
  workers: process.env.CI ? '100%' : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:3333',

    /* Take screenshot on failure. */
    screenshot: 'only-on-failure',

    /* Record video on failure. */
    video: 'retain-on-failure',

    /* Collect trace on failure. */
    trace: 'retain-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    /* Test against mobile viewports. */
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 17 Pro'] },
    },
  ],

  /* Locally, test against the dev server. On CI, build once and serve the result so no test
     waits on an on-demand compile (the Studio bundle alone could exceed its 30s timeout). */
  webServer: {
    command: process.env.CI ? 'pnpm run build && pnpm run start -p 3333' : 'pnpm run dev',
    url: 'http://localhost:3333',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
