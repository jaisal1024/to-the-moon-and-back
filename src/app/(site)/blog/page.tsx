import client from 'apollo-client';
import { Metadata } from 'next';
import SitePage from 'src/components/site/SitePage';
import { GET_BLOG_POSTS, type GetBlogPostsData } from 'src/queries/GetBlogPosts';

import BlogIndex, { type BlogIndexPost } from './BlogIndex';
import { formatPostDate } from './formatPostDate';

export const metadata: Metadata = {
  title: 'Jaisal Friedman - Blog',
  description: 'Collection of past blog posts',
};

export const revalidate = 600;

export default async function BlogPage() {
  const { data } = await client
    .query<GetBlogPostsData>({
      query: GET_BLOG_POSTS,
    })
    .catch((err) => {
      console.error('Blog page data fetch failed', err);
      throw err;
    });

  const posts: BlogIndexPost[] = (data?.allBlogPost ?? []).flatMap((post) => {
    const slug = post.slug?.current;
    if (!post.title || !slug) return [];
    return [{ title: post.title, href: `/blog/${slug}`, ...formatPostDate(post.publishedAt) }];
  });

  return (
    <SitePage>
      <BlogIndex posts={posts} />
    </SitePage>
  );
}
