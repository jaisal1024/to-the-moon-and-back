import { expect, test } from '@playwright/test';

test.describe('Revalidation API', () => {
  test('revalidateRoute endpoint handles unauthorized requests', async ({
    request,
  }) => {
    const response = await request.post('/api/revalidateRoute', {
      headers: { secret: 'wrong-secret', route: '/' },
    });
    expect(response.ok()).toBe(false);
  });

  test('revalidateRoute endpoint handles valid requests', async ({
    request,
  }) => {
    const response = await request.post('/api/revalidateRoute', {
      headers: {
        secret: process.env.SANITY_WEBHOOK_SECRET || '',
        route: '/',
      },
    });
    // This will pass if the secret matches what the dev server is using
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.message).toBe('Revalidated /');
  });

  test('revalidate (webhook) endpoint rejects invalid signatures', async ({
    request,
  }) => {
    const response = await request.post('/api/revalidate', {
      data: { type: 'collections', slug: 'test' },
      headers: { 'x-sanity-signature': 'invalid' },
    });
    expect(response.ok()).toBe(false);
  });
});
