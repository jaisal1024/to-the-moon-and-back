import { Typography } from '@mui/material';
import client from 'apollo-client';
import { Metadata } from 'next';
import Layout from 'src/components/Layout';
import Link from 'src/components/Link';
import {
  GET_BLOG_POSTS,
  type GetBlogPostsData,
} from 'src/queries/GetBlogPosts';

export const metadata: Metadata = {
  title: 'Jaisal Friedman - Blog',
  description: 'Collection of past blog posts',
};

export const revalidate = 600;

function formatPublishDate(publishedAt: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(publishedAt));
}

export default async function BlogPage() {
  const { data } = await client
    .query<GetBlogPostsData>({
      query: GET_BLOG_POSTS,
    })
    .catch((err) => {
      console.error('Blog page data fetch failed', err);
      throw err;
    });

  const posts = data.allBlogPost;

  return (
    <Layout>
      <section className="mx-auto flex w-full max-w-4xl flex-col gap-8 py-8">
        <div className="flex items-center justify-between gap-4">
          <Typography variant="h1">Blog</Typography>
        </div>
        {posts.length === 0 ? (
          <Typography variant="body1">
            No blog posts yet. Add one in Sanity Studio to populate this page.
          </Typography>
        ) : (
          <div className="flex flex-col gap-6">
            {posts.map((post) => (
              <article
                key={post._id}
                className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm"
              >
                <div className="mb-3">
                  <Link
                    href={`/blog/${post.slug.current}`}
                    noLinkStyle
                    className="inline-block"
                  >
                    <Typography variant="h3">{post.title}</Typography>
                  </Link>
                  <Typography variant="body2" className="mt-1 uppercase">
                    {post?.publishedAt
                      ? formatPublishDate(post.publishedAt)
                      : 'Unpublished'}
                  </Typography>
                </div>
                <Link
                  href={`/blog/${post.slug.current}`}
                  noLinkStyle
                  className="mt-4 inline-block underline underline-offset-4"
                >
                  <Typography variant="body2">Read post</Typography>
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </Layout>
  );
}
