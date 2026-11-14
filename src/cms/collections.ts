import type { Collection } from 'src/payload-types';

import { getCms } from './client';

// Every site read runs with the anonymous access rules, so drafts never leak onto
// the public site even though the Local API could bypass access control.
const PUBLIC = { overrideAccess: false } as const;

/** The collections index: newest first, with photo media populated. */
export async function listCollections({ limit = 20 }: { limit?: number } = {}): Promise<Collection[]> {
  const cms = await getCms();
  const { docs } = await cms.find({ collection: 'collections', sort: '-createdAt', limit, depth: 1, ...PUBLIC });
  return docs;
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
