import { Typography } from '@mui/material';
import { Metadata } from 'next';
import { listPosts } from 'src/cms/posts';
import Layout from 'src/components/Layout';
import Link from 'src/components/Link';
import { formatPublishDate } from 'src/utils/formatPublishDate';

export const metadata: Metadata = {
  title: 'Jaisal Friedman - Blog',
  description: 'Collection of past blog posts',
};

export const revalidate = 600;

export default async function BlogPage() {
  const posts = await listPosts();

  return (
    <Layout>
      <section className="mx-auto flex w-full max-w-4xl flex-col gap-8 py-8">
        <div className="flex items-center justify-between gap-4">
          <Typography variant="h1">Blog</Typography>
        </div>
        {posts.length === 0 ? (
          <Typography variant="body1">No blog posts yet. Add one in the admin to populate this page.</Typography>
        ) : (
          <div className="flex flex-col gap-6">
            {posts.map((post) => (
              <article key={post.id} className="rounded-2xl border border-borderSubtle bg-surface p-6 shadow-xs">
                <div className="mb-3">
                  <Link href={`/blog/${post.slug}`} noLinkStyle className="inline-block">
                    <Typography variant="h3">{post.title}</Typography>
                  </Link>
                  <Typography variant="body2" className="mt-1 uppercase">
                    {formatPublishDate(post.publishedAt)}
                  </Typography>
                </div>
                <Link
                  href={`/blog/${post.slug}`}
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
