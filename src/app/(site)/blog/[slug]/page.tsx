import { Typography } from '@mui/material';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPostBySlug, listPostSlugs } from 'src/cms/posts';
import Layout from 'src/components/Layout';
import PostBody from 'src/components/PostBody';
import { formatPublishDate } from 'src/utils/formatPublishDate';

export const revalidate = 600;

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  return {
    title: `Jaisal Friedman - ${post?.title ?? 'Blog Post'}`,
  };
}

export async function generateStaticParams() {
  const slugs = await listPostSlugs();
  return slugs.map((slug) => ({ slug }));
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  return (
    <Layout>
      <article className="mx-auto flex w-full max-w-4xl flex-col gap-6 py-8">
        <header className="flex flex-col gap-3">
          <Typography variant="h1">{post.title}</Typography>
          <Typography variant="body2" className="uppercase">
            {formatPublishDate(post.publishedAt)}
          </Typography>
        </header>
        <section className="flex flex-col gap-4">
          <PostBody body={post.body} />
        </section>
      </article>
    </Layout>
  );
}
