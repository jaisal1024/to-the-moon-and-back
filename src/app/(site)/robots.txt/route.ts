import { SITE_URL } from 'src/config/site';

const body = `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`;

export async function GET() {
  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}

