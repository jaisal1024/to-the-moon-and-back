import { expect, test } from '@playwright/test';

test.describe('Revalidation API', () => {
  test('revalidateRoute endpoint handles unauthorized requests', async ({ request }) => {
    const response = await request.post('/api/revalidateRoute', {
      headers: { secret: 'wrong-secret', route: '/' },
    });
    expect(response.ok()).toBe(false);
  });

  test('revalidateRoute endpoint handles valid requests', async ({ request }) => {
    const response = await request.post('/api/revalidateRoute', {
      headers: {
        secret: process.env.REVALIDATE_SECRET || '',
        route: '/',
      },
    });
    // This will pass if the secret matches what the dev server is using
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.message).toBe('Revalidated /');
  });
});
