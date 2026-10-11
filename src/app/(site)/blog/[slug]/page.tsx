import client from 'apollo-client';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import SitePage from 'src/components/site/SitePage';
import { GET_BLOG_POST, GET_BLOG_POST_SLUGS, type GetBlogPostData } from 'src/queries/GetBlogPost';

import { formatPostDate } from '../formatPostDate';
import { portableTextToRichBlocks } from '../richText';
import Post from './Post';

type Props = {
  params: Promise<{ slug: string }>;
};

export const revalidate = 600;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { data } = await client.query<GetBlogPostData>({
    query: GET_BLOG_POST,
    variables: { slug_current: slug },
  });

  const post = data?.allBlogPost?.[0];

  return {
    title: `Jaisal Friedman - ${post?.title ?? 'Blog Post'}`,
  };
}

export async function generateStaticParams() {
  const { data } = await client
    .query<{ allBlogPost: Array<{ slug?: { current?: string } }> }>({
      query: GET_BLOG_POST_SLUGS,
    })
    .catch((err) => {
      console.error('generateStaticParams failed for blog posts', err);
      return { data: null };
    });

  if (!data) return [];

  return data.allBlogPost.flatMap((post) => (post?.slug?.current ? [{ slug: post.slug.current }] : []));
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const { data } = await client
    .query<GetBlogPostData>({
      query: GET_BLOG_POST,
      variables: { slug_current: slug },
    })
    .catch((err) => {
      console.error('Blog post data fetch failed', err);
      throw err;
    });

  const post = data?.allBlogPost?.[0];

  if (!post) {
    notFound();
  }

  return (
    <SitePage>
      <Post
        title={post.title ?? ''}
        {...formatPostDate(post.publishedAt)}
        body={portableTextToRichBlocks(post.bodyRaw)}
      />
    </SitePage>
  );
}
