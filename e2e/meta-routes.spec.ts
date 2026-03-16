import { expect, test } from '@playwright/test';

test.describe('meta text and sitemap routes', () => {
  test('llms.txt serves markdown text with key sections', async ({ page }) => {
    const response = await page.goto('/llms.txt');

    expect(response, 'response should be defined').not.toBeNull();
    expect(response!.status()).toBe(200);
    expect(response!.headers()['content-type']).toContain('text/plain');

    const body = await page.textContent('body');
    expect(body).toBeTruthy();
    expect(body).toContain('# Jaisal Friedman');
    expect(body).toContain('Important notes:');
    expect(body).toContain('/robots.txt');
    expect(body).toContain('/sitemap.xml');
  });

  test('robots.txt allows all and links sitemap', async ({ page }) => {
    const response = await page.goto('/robots.txt');

    expect(response, 'response should be defined').not.toBeNull();
    expect(response!.status()).toBe(200);
    expect(response!.headers()['content-type']).toContain('text/plain');

    const body = await page.textContent('body');
    expect(body).toContain('User-agent: *');
    expect(body).toContain('Allow: /');
    expect(body).toContain('Sitemap: https://www.jaisal.xyz/sitemap.xml');
  });

  test('sitemap.xml returns urlset with main pages', async ({ page }) => {
    const response = await page.goto('/sitemap.xml');

    expect(response, 'response should be defined').not.toBeNull();
    expect(response!.status()).toBe(200);
    expect(response!.headers()['content-type']).toContain('application/xml');

    const xml = await page.content();
    expect(xml).toContain('<urlset');
    expect(xml).toContain('<loc>https://www.jaisal.xyz/</loc>');
    expect(xml).toContain('<loc>https://www.jaisal.xyz/about</loc>');
    expect(xml).toContain('<loc>https://www.jaisal.xyz/blog</loc>');
    expect(xml).toContain('<loc>https://www.jaisal.xyz/collections</loc>');
  });
});

