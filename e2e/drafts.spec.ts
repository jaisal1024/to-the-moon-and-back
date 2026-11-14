import { expect, test } from '@playwright/test';

import { signIn } from './support/admin';

// Drafts must never reach anonymous visitors: not as pages, not in listings, and
// not through Payload's REST API.
test('draft posts and collections stay hidden from anonymous visitors', async ({ page, browser }) => {
  await signIn(page);
  const stamp = Date.now();
  const post = { title: `Draft post ${stamp}`, slug: `draft-post-${stamp}` };
  const collection = { title: `Draft collection ${stamp}`, slug: `draft-collection-${stamp}` };

  // ?draft=true saves a draft without requiring every field.
  const createdPost = await page.request.post('/api/posts?draft=true', {
    data: { ...post, publishedAt: new Date().toISOString(), _status: 'draft' },
  });
  expect(createdPost.ok(), await createdPost.text()).toBe(true);
  const createdCollection = await page.request.post('/api/collections?draft=true', {
    data: { ...collection, _status: 'draft' },
  });
  expect(createdCollection.ok(), await createdCollection.text()).toBe(true);
  const postId = (await createdPost.json()).doc.id;
  const collectionId = (await createdCollection.json()).doc.id;

  const anonymous = await browser.newContext();
  const visitor = await anonymous.newPage();
  try {
    expect((await visitor.goto(`/blog/${post.slug}`))?.status()).toBe(404);
    expect((await visitor.goto(`/collections/${collection.slug}`))?.status()).toBe(404);

    await visitor.goto('/blog');
    await expect(visitor.getByText(post.title)).toHaveCount(0);
    await visitor.goto('/');
    await expect(visitor.getByText(collection.title)).toHaveCount(0);

    const apiPosts = await visitor.request.get(`/api/posts?where[slug][equals]=${post.slug}`);
    expect((await apiPosts.json()).docs).toEqual([]);
    const apiCollections = await visitor.request.get(`/api/collections?where[slug][equals]=${collection.slug}`);
    expect((await apiCollections.json()).docs).toEqual([]);
  } finally {
    await anonymous.close();
    await page.request.delete(`/api/posts/${postId}`);
    await page.request.delete(`/api/collections/${collectionId}`);
  }
});
