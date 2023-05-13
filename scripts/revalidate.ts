// Usage: ts-node scripts/revalidate.ts <slug>
// Script revalidates all the routes for a given collection slug across different domains which next doesn't handle :(

import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const slug = process.argv[2];

if (!slug) {
  console.error('Missing slug argument');
  process.exit(1);
}

const baseUrlToRevalidate = [
  'https://www.jaisalfriedman.com',
  'https://jaisal.xyz',
];

async function revalidateRoute(url: string, route: string) {
  const resp = await fetch(`${url}/api/revalidateRoute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      secret: process.env.SANITY_WEBHOOK_SECRET ?? '',
      route: route,
    },
  });
  if (resp.status === 200) {
    console.log(`Revalidation successful for ${route}`);
  } else {
    console.error(
      `Revalidation failed for ${route} on ${url} with status ${resp.status}`
    );
    throw new Error(await resp.text());
  }
}

async function revalidate() {
  console.log(`Revalidating ${slug}`);
  await Promise.all(
    baseUrlToRevalidate.map(async (url) => {
      await revalidateRoute(url, '/');
      await revalidateRoute(url, `/collections/${slug}`);
    })
  );
}

revalidate()
  .then(() => {
    console.log('Revalidation complete');
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
