import type { Collection } from 'src/payload-types';

import { getCms } from './client';

// Every site read runs with the anonymous access rules, so drafts never leak onto
// the public site even though the Local API could bypass access control.
const PUBLIC = { overrideAccess: false } as const;

export type NavCollection = Pick<Collection, 'id' | 'title' | 'slug'>;

/** Newest first, with photo media populated, for the homepage grid. */
export async function listCollections({ limit = 10 }: { limit?: number } = {}): Promise<Collection[]> {
  const cms = await getCms();
  const { docs } = await cms.find({ collection: 'collections', sort: '-createdAt', limit, depth: 1, ...PUBLIC });
  return docs;
}

export async function listNavCollections({ limit = 20 }: { limit?: number } = {}): Promise<NavCollection[]> {
  const cms = await getCms();
  const { docs } = await cms.find({
    collection: 'collections',
    sort: '-createdAt',
    limit,
    depth: 0,
    select: { title: true, slug: true },
    ...PUBLIC,
  });
  return docs.map(({ id, title, slug }) => ({ id, title, slug }));
}

export async function getCollectionBySlug(slug: string): Promise<Collection | null> {
  const cms = await getCms();
  const { docs } = await cms.find({
    collection: 'collections',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 1,
    ...PUBLIC,
  });
  return docs[0] ?? null;
}

export async function listCollectionSlugs(): Promise<string[]> {
  const cms = await getCms();
  const { docs } = await cms.find({
    collection: 'collections',
    pagination: false,
    depth: 0,
    select: { slug: true },
    ...PUBLIC,
  });
  return docs.map((doc) => doc.slug);
}
