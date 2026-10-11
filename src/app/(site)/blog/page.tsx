import { Metadata } from 'next';
import { listPosts } from 'src/cms/posts';
import SitePage from 'src/components/site/SitePage';

import BlogIndex, { type BlogIndexPost } from './BlogIndex';
import { formatPostDate } from './formatPostDate';

export const metadata: Metadata = {
  title: 'Jaisal Friedman - Blog',
  description: 'Collection of past blog posts',
};

export const revalidate = 600;

export default async function BlogPage() {
  const posts: BlogIndexPost[] = (
    await listPosts().catch((err) => {
      console.error('Blog page data fetch failed', err);
      throw err;
    })
  ).map((post) => ({ title: post.title, href: `/blog/${post.slug}`, ...formatPostDate(post.publishedAt) }));

  return (
    <SitePage>
      <BlogIndex posts={posts} />
    </SitePage>
  );
}
