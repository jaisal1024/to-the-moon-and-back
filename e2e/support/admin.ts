import { readFileSync } from 'node:fs';
import path from 'node:path';

import type { Page } from '@playwright/test';

// Test-only admin, created by e2e/global-setup.ts through the Local API.
// Never use these credentials against a real deployment.
export const E2E_ADMIN = { email: 'e2e-admin@example.test', password: 'e2e-admin-password' };

/** Session saved by global setup; gitignored. */
export const ADMIN_STATE_PATH = path.resolve(import.meta.dirname, '../../test-results/.auth/admin.json');

/**
 * Reuses the one session global setup logged in. Payload stores sessions on the user
 * document, so parallel workers logging in as the same user can overwrite each other.
 */
export async function signIn(page: Page) {
  const { cookies } = JSON.parse(readFileSync(ADMIN_STATE_PATH, 'utf8'));
  await page.context().addCookies(cookies);
}
