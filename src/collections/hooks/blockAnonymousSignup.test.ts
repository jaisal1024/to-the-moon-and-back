import type { PayloadRequest } from 'payload';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { blockAnonymousSignup } from './blockAnonymousSignup';

const run = (operation: string, req: Partial<PayloadRequest>) =>
  (blockAnonymousSignup as any)({ args: { data: {} }, operation, req: { t: (k: string) => k, ...req } });

describe('blockAnonymousSignup', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('rejects anonymous HTTP account creation on Vercel', () => {
    vi.stubEnv('VERCEL', '1');
    expect(() => run('create', { payloadAPI: 'REST' })).toThrow();
    expect(() => run('create', { payloadAPI: 'GraphQL' })).toThrow();
  });

  it('allows signed-in admins and Local API scripts on Vercel', () => {
    vi.stubEnv('VERCEL', '1');
    expect(run('create', { payloadAPI: 'REST', user: { id: 1 } as PayloadRequest['user'] })).toEqual({ data: {} });
    expect(run('create', { payloadAPI: 'local' })).toEqual({ data: {} });
  });

  it('leaves other operations alone', () => {
    vi.stubEnv('VERCEL', '1');
    expect(run('read', { payloadAPI: 'REST' })).toEqual({ data: {} });
  });

  it('keeps the first-user flow locally and in CI', () => {
    vi.stubEnv('VERCEL', '');
    expect(run('create', { payloadAPI: 'REST' })).toEqual({ data: {} });
  });
});
