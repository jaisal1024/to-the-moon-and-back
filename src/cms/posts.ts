import type { Post } from 'src/payload-types';

import { getCms } from './client';

const PUBLIC = { overrideAccess: false } as const;

export type PostSummary = Pick<Post, 'id' | 'title' | 'slug' | 'publishedAt'>;

/** Newest first, without bodies, for the blog index. */
export async function listPosts(): Promise<PostSummary[]> {
  const cms = await getCms();
  const { docs } = await cms.find({
    collection: 'posts',
    sort: '-publishedAt',
    pagination: false,
    depth: 0,
    select: { title: true, slug: true, publishedAt: true },
    ...PUBLIC,
  });
  return docs.map(({ id, title, slug, publishedAt }) => ({ id, title, slug, publishedAt }));
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  const cms = await getCms();
  const { docs } = await cms.find({
    collection: 'posts',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
    ...PUBLIC,
  });
  return docs[0] ?? null;
}

export async function listPostSlugs(): Promise<string[]> {
  const cms = await getCms();
  const { docs } = await cms.find({
    collection: 'posts',
    pagination: false,
    depth: 0,
    select: { slug: true },
    ...PUBLIC,
  });
  return docs.map((doc) => doc.slug);
}
