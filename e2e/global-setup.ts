import { execFileSync } from 'node:child_process';
import path from 'node:path';

import { type FullConfig, request } from '@playwright/test';

import { ADMIN_STATE_PATH, E2E_ADMIN } from './support/admin';

/**
 * Ensures the e2e admin exists, then logs in once and saves the session for every spec.
 * Uses the Local API script, so it works whether or not the database already has other
 * users. Playwright starts the web server before global setup, so the login can run here.
 */
export default async function globalSetup(config: FullConfig) {
  const root = path.resolve(import.meta.dirname, '..');
  execFileSync(path.join(root, 'node_modules/.bin/payload'), ['run', 'scripts/create-admin.ts'], {
    cwd: root,
    env: { ...process.env, ADMIN_EMAIL: E2E_ADMIN.email, ADMIN_PASSWORD: E2E_ADMIN.password },
    stdio: 'inherit',
  });

  const baseURL = config.projects[0]?.use.baseURL;
  const api = await request.newContext({ baseURL });
  const login = await api.post('/api/users/login', { data: E2E_ADMIN });
  if (!login.ok()) throw new Error(`e2e admin login failed: ${login.status()} ${await login.text()}`);
  await api.storageState({ path: ADMIN_STATE_PATH });
  await api.dispose();
}
