/**
 * One-shot content migration from Sanity to Payload.
 *
 *   SANITY_DATASET=development DRY_RUN=1 bun run migrate:sanity   # fetch + convert + verify, no writes
 *   SANITY_DATASET=production bun run migrate:sanity              # write into DATABASE_URL
 *
 * Reads Sanity's HTTP query API (public datasets need no token; set SANITY_API_TOKEN
 * otherwise), downloads every referenced image into Payload media, and upserts
 * collections and posts by their Sanity `_id`, so re-running updates instead of
 * duplicating. Bulk writes pass `skipRevalidate`; revalidate after a production run.
 */
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import config from '@payload-config';
import { getPayload, type Payload, type RequiredDataFromCollectionSlug } from 'payload';

import {
  lexicalToPlainText,
  type PortableTextNode,
  portableTextToLexical,
  portableTextToPlainText,
} from './lib/portableTextToLexical';
import { checkStorageTargets } from './lib/storageTargets';

type SanityAsset = { _id: string; url: string; originalFilename?: string; mimeType?: string };
type SanityCollection = {
  _id: string;
  _createdAt: string;
  title?: string;
  slug?: string;
  description?: string;
  date?: string;
  location?: string;
  photos?: { _key: string; title?: string; asset?: SanityAsset | null }[];
};
type SanityPost = {
  _id: string;
  _createdAt: string;
  title?: string;
  slug?: string;
  publishedAt?: string;
  body?: PortableTextNode[];
};

// Public Sanity project for this site; override with SANITY_PROJECT_ID.
const projectId = process.env.SANITY_PROJECT_ID ?? '6qd0txmw';
const dataset = process.env.SANITY_DATASET;
const token = process.env.SANITY_API_TOKEN;
const dryRun = process.env.DRY_RUN === '1';
const API_VERSION = '2023-01-01';

// Published documents only; Sanity drafts live under `drafts.*` ids.
const PUBLISHED = '!(_id in path("drafts.**"))';
const COLLECTIONS_QUERY = `*[_type == "collections" && ${PUBLISHED}] | order(_createdAt asc) {
  _id, _createdAt, title, "slug": slug.current, description, date, location,
  photos[] { _key, title, "asset": photo.asset->{ _id, url, originalFilename, mimeType } }
}`;
const POSTS_QUERY = `*[_type == "blogPost" && ${PUBLISHED}] | order(_createdAt asc) {
  _id, _createdAt, title, "slug": slug.current, publishedAt, body
}`;

// Upserts are keyed on sanityId and must not trigger Next.js revalidation.
// Payload uses this object as req.context and stashes upload state on it, so every
// call needs a fresh one; a shared object makes later uploads silently skip storage.
const context = () => ({ skipRevalidate: true });

async function querySanity<T>(query: string): Promise<T> {
  const url = new URL(`https://${projectId}.api.sanity.io/v${API_VERSION}/data/query/${dataset}`);
  url.searchParams.set('query', query);
  const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) throw new Error(`Sanity query failed (${res.status}): ${await res.text()}`);
  return ((await res.json()) as { result: T }).result;
}

async function findBySanityId(payload: Payload, collection: 'media' | 'collections' | 'posts', sanityId: string) {
  const { docs } = await payload.find({
    collection,
    where: { sanityId: { equals: sanityId } },
    limit: 1,
    depth: 0,
    draft: true,
  });
  return docs[0] ?? null;
}

async function migrateAsset(payload: Payload, asset: SanityAsset, alt: string, workDir: string) {
  const existing = await findBySanityId(payload, 'media', asset._id);
  if (existing) return existing.id;

  const res = await fetch(asset.url);
  if (!res.ok) throw new Error(`Download failed (${res.status}) for ${asset.url}`);
  const filename = asset.originalFilename ?? path.basename(new URL(asset.url).pathname);
  // One folder per asset keeps the original filename (Payload uses it in the public
  // URL and de-duplicates repeats like 1.jpg) without temp files colliding.
  const assetDir = path.join(workDir, asset._id);
  await mkdir(assetDir, { recursive: true });
  const filePath = path.join(assetDir, filename);
  await writeFile(filePath, Buffer.from(await res.arrayBuffer()));

  const doc = await payload.create({
    collection: 'media',
    data: { alt, sanityId: asset._id },
    filePath,
    context: context(),
  });
  await rm(assetDir, { recursive: true, force: true });
  return doc.id;
}

type Upsertable = 'collections' | 'posts';

async function upsert<T extends Upsertable>(
  payload: Payload,
  collection: T,
  sanityId: string,
  data: RequiredDataFromCollectionSlug<T>,
) {
  const existing = await findBySanityId(payload, collection, sanityId);
  // Payload's create/update overloads cannot narrow a generic slug, so widen to
  // the plain options type; `data` is already checked against the slug above.
  const local = payload as unknown as {
    create: (args: object) => Promise<unknown>;
    update: (args: object) => Promise<unknown>;
  };
  if (existing) {
    await local.update({ collection, id: existing.id, data, context: context() });
    return 'updated';
  }
  await local.create({ collection, data: { ...data, sanityId }, context: context() });
  return 'created';
}

async function main() {
  if (!projectId || !dataset) throw new Error('Set SANITY_DATASET (production or development).');
  console.log(`Sanity ${projectId}/${dataset} -> Payload${dryRun ? ' (dry run, no writes)' : ''}`);

  const [collections, posts] = await Promise.all([
    querySanity<SanityCollection[]>(COLLECTIONS_QUERY),
    querySanity<SanityPost[]>(POSTS_QUERY),
  ]);
  const photoCount = collections.reduce((n, c) => n + (c.photos?.length ?? 0), 0);
  console.log(`Found ${collections.length} collections (${photoCount} photos) and ${posts.length} posts.`);

  // Verify rich text conversion before writing anything.
  let textMismatches = 0;
  const convertedBodies = new Map<string, ReturnType<typeof portableTextToLexical>>();
  for (const post of posts) {
    const lexical = portableTextToLexical(post.body ?? []);
    convertedBodies.set(post._id, lexical);
    const same = lexicalToPlainText(lexical) === portableTextToPlainText(post.body ?? []);
    if (!same) textMismatches++;
    console.log(`  post "${post.title}": text ${same ? 'matches' : 'DIFFERS'} after conversion`);
  }
  if (textMismatches) throw new Error(`${textMismatches} post(s) lost text in conversion; aborting.`);
  if (dryRun) {
    console.log('Dry run complete.');
    return;
  }

  checkStorageTargets(process.env);
  const payload = await getPayload({ config });
  const workDir = await mkdtemp(path.join(tmpdir(), 'sanity-migrate-'));
  try {
    for (const collection of collections) {
      const photos = [];
      for (const shot of collection.photos ?? []) {
        if (!shot.asset) continue;
        const alt = shot.title || collection.title || shot.asset.originalFilename || 'Photo';
        photos.push({ photo: await migrateAsset(payload, shot.asset, alt, workDir), title: shot.title ?? null });
      }
      const result = await upsert(payload, 'collections', collection._id, {
        title: collection.title ?? collection.slug ?? 'Untitled',
        slug: collection.slug,
        description: collection.description ?? null,
        date: collection.date ?? null,
        location: collection.location ?? null,
        photos,
        // The homepage orders by creation time, so keep Sanity's.
        createdAt: collection._createdAt,
        _status: 'published',
      });
      console.log(`  collection "${collection.title}": ${result} with ${photos.length} photos`);
    }

    for (const post of posts) {
      const result = await upsert(payload, 'posts', post._id, {
        title: post.title ?? post.slug ?? 'Untitled',
        slug: post.slug,
        publishedAt: post.publishedAt ?? post._createdAt,
        body: convertedBodies.get(post._id),
        createdAt: post._createdAt,
        _status: 'published',
      });
      console.log(`  post "${post.title}": ${result}`);
    }
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }

  const [media, payloadCollections, payloadPosts] = await Promise.all([
    payload.count({ collection: 'media', where: { sanityId: { exists: true } } }),
    payload.count({ collection: 'collections', where: { sanityId: { exists: true } } }),
    payload.count({ collection: 'posts', where: { sanityId: { exists: true } } }),
  ]);
  const uniqueAssets = new Set(collections.flatMap((c) => (c.photos ?? []).map((p) => p.asset?._id).filter(Boolean)));
  console.table({
    media: { sanity: uniqueAssets.size, payload: media.totalDocs },
    collections: { sanity: collections.length, payload: payloadCollections.totalDocs },
    posts: { sanity: posts.length, payload: payloadPosts.totalDocs },
  });
  if (
    media.totalDocs !== uniqueAssets.size ||
    payloadCollections.totalDocs !== collections.length ||
    payloadPosts.totalDocs !== posts.length
  ) {
    throw new Error('Counts differ between Sanity and Payload; inspect before cutover.');
  }
  console.log('Migration complete. Revalidate the site (or redeploy) to publish the new content.');
}

try {
  await main();
  process.exit(0);
} catch (err) {
  console.error(err);
  process.exit(1);
}
