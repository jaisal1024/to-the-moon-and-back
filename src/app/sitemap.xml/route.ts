import { SITE_URL } from 'src/config/site';

const paths = ['/', '/about', '/blog', '/collections'];

const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths
  .map(
    (path) => `  <url>
    <loc>${SITE_URL}${path}</loc>
  </url>`,
  )
  .join('\n')}
</urlset>
`;

export async function GET() {
  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
}

