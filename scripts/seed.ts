/**
 * Seeds an empty Payload database with sample content for local development and CI.
 *
 *   bun run seed               # no-op when content already exists
 *
 * Images are generated placeholders, so no network or Sanity access is needed.
 * For real content locally, use `bun run migrate:sanity` instead.
 */
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import config from '@payload-config';
import { getPayload, type Payload } from 'payload';
import sharp from 'sharp';

// Payload uses this object as req.context and stashes upload state on it, so every
// call needs a fresh one; a shared object makes later uploads silently skip storage.
const context = () => ({ skipRevalidate: true });

const SEED_COLLECTIONS = [
  {
    title: 'Seed Coast',
    slug: 'seed-coast',
    location: 'Popoyo, Nicaragua',
    date: '2023-04-01',
    colors: ['#2a6f97', '#61a5c2'],
  },
  {
    title: 'Seed Desert',
    slug: 'seed-desert',
    location: 'Liwa, UAE',
    date: '2023-05-01',
    colors: ['#bc6c25', '#dda15e'],
  },
  {
    title: 'Seed City',
    slug: 'seed-city',
    location: 'Havana, Cuba',
    date: '2023-06-01',
    colors: ['#6d597a', '#b56576'],
  },
];

async function placeholder(dir: string, name: string, color: string, label: string) {
  const filePath = path.join(dir, `${name}.jpg`);
  const svg = `<svg width="2400" height="1600" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="${color}"/>
    <text x="50%" y="50%" font-family="sans-serif" font-size="160" fill="white" text-anchor="middle">${label}</text>
  </svg>`;
  await sharp(Buffer.from(svg)).jpeg({ quality: 80 }).toFile(filePath);
  return filePath;
}

async function seedCollections(payload: Payload, dir: string) {
  for (const [index, seed] of SEED_COLLECTIONS.entries()) {
    const photos = [];
    for (const [shot, color] of seed.colors.entries()) {
      const label = `${seed.title} ${shot + 1}`;
      const media = await payload.create({
        collection: 'media',
        data: { alt: label },
        filePath: await placeholder(dir, `${seed.slug}-${shot + 1}`, color, label),
        context: context(),
      });
      photos.push({ photo: media.id, title: label });
    }
    await payload.create({
      collection: 'collections',
      data: {
        title: seed.title,
        slug: seed.slug,
        description: `Sample collection ${index + 1}`,
        location: seed.location,
        date: seed.date,
        photos,
        _status: 'published',
      },
      context: context(),
    });
    console.log(`Seeded collection "${seed.title}"`);
  }
}

async function main() {
  const payload = await getPayload({ config });
  const { totalDocs } = await payload.count({ collection: 'collections' });
  if (totalDocs > 0) {
    console.log(`Database already has ${totalDocs} collections; skipping seed.`);
    return;
  }
  const dir = await mkdtemp(path.join(tmpdir(), 'payload-seed-'));
  try {
    await seedCollections(payload, dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

try {
  await main();
  process.exit(0);
} catch (err) {
  console.error(err);
  process.exit(1);
}
