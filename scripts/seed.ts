/**
 * Seeds an empty Payload database with sample content for local development and CI.
 *
 *   bun run seed               # no-op when content already exists
 *
 * Seeds collections and posts independently, each only when that collection is empty.
 * Images are generated placeholders, so no network or Sanity access is needed.
 * For real content locally, use `bun run migrate:sanity` instead.
 */
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import config from '@payload-config';
import { getPayload, type Payload } from 'payload';
import sharp from 'sharp';

import { type PortableTextNode, portableTextToLexical } from './lib/portableTextToLexical';

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

const span = (text: string, marks: string[] = []) => ({ _type: 'span' as const, text, marks });

// Exercises every node the blog renderer handles: headings, links, inline code, lists, code blocks.
const SEED_POST_BODY: PortableTextNode[] = [
  { _type: 'block', style: 'normal', markDefs: [], children: [span('A sample post seeded for local development.')] },
  { _type: 'block', style: 'h2', markDefs: [], children: [span('Seed heading')] },
  {
    _type: 'block',
    style: 'normal',
    markDefs: [{ _key: 'docs', _type: 'link', href: 'https://payloadcms.com/docs' }],
    children: [span('Read the '), span('Payload docs', ['docs']), span(' and run '), span('bun run seed', ['code'])],
  },
  {
    _type: 'block',
    style: 'normal',
    listItem: 'bullet',
    level: 1,
    markDefs: [],
    children: [span('First point', ['strong'])],
  },
  { _type: 'block', style: 'normal', listItem: 'bullet', level: 1, markDefs: [], children: [span('Second point')] },
  { _type: 'codeBlock', _key: 'seedcode', language: 'typescript', code: 'export const seeded = true;' },
];

async function seedPosts(payload: Payload) {
  await payload.create({
    collection: 'posts',
    data: {
      title: 'Seed Post',
      slug: 'seed-post',
      publishedAt: '2025-01-15T12:00:00.000Z',
      body: portableTextToLexical(SEED_POST_BODY),
      _status: 'published',
    },
    context: context(),
  });
  console.log('Seeded post "Seed Post"');
}

async function main() {
  const payload = await getPayload({ config });

  const collections = await payload.count({ collection: 'collections' });
  if (collections.totalDocs > 0) {
    console.log(`Database already has ${collections.totalDocs} collections; skipping collections.`);
  } else {
    const dir = await mkdtemp(path.join(tmpdir(), 'payload-seed-'));
    try {
      await seedCollections(payload, dir);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }

  const posts = await payload.count({ collection: 'posts' });
  if (posts.totalDocs > 0) {
    console.log(`Database already has ${posts.totalDocs} posts; skipping posts.`);
  } else {
    await seedPosts(payload);
  }
}

try {
  await main();
  process.exit(0);
} catch (err) {
  console.error(err);
  process.exit(1);
}
