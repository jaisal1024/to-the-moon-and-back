import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPostBySlug, listPostSlugs } from 'src/cms/posts';
import SitePage from 'src/components/site/SitePage';

import { formatPostDate } from '../formatPostDate';
import { lexicalToRichBlocks } from '../richText';
import Post from './Post';

type Props = {
  params: Promise<{ slug: string }>;
};

export const revalidate = 600;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug).catch(() => null);

  return {
    title: `Jaisal Friedman - ${post?.title ?? 'Blog Post'}`,
  };
}

export async function generateStaticParams() {
  const slugs = await listPostSlugs().catch((err) => {
    console.error('generateStaticParams failed for blog posts', err);
    return [];
  });
  return slugs.map((slug) => ({ slug }));
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPostBySlug(slug).catch((err) => {
    console.error('Blog post data fetch failed', err);
    throw err;
  });

  if (!post) {
    notFound();
  }

  return (
    <SitePage>
      <Post title={post.title} {...formatPostDate(post.publishedAt)} body={lexicalToRichBlocks(post.body)} />
    </SitePage>
  );
}
