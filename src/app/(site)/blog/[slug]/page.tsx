import { Typography } from '@mui/material';
import { PortableText } from '@portabletext/react';
import client from 'apollo-client';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import Layout from 'src/components/Layout';
import {
  GET_BLOG_POST,
  GET_BLOG_POST_SLUGS,
  type GetBlogPostData,
  type PortableTextBlock,
  type PortableTextCodeBlock,
} from 'src/queries/GetBlogPost';

type Props = {
  params: Promise<{ slug: string }>;
};

function formatPublishDate(publishedAt: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(publishedAt));
}

const portableTextComponents = {
  block: {
    normal: ({ children }: { children?: React.ReactNode }) => (
      <Typography variant="body1" className="leading-8">
        {children}
      </Typography>
    ),
    h2: ({ children }: { children?: React.ReactNode }) => (
      <Typography variant="h2" className="mt-8">
        {children}
      </Typography>
    ),
    h3: ({ children }: { children?: React.ReactNode }) => (
      <Typography variant="h3" className="mt-6">
        {children}
      </Typography>
    ),
  },
  marks: {
    code: ({ children }: { children?: React.ReactNode }) => (
      <code className="rounded bg-surfaceElevated px-1.5 py-0.5 font-mono text-[0.9em]">{children}</code>
    ),
    link: ({ value, children }: { value?: { href: string }; children: React.ReactNode }) => {
      const href = value?.href ?? '';
      return (
        <a
          href={href}
          className="text-blue-600 underline decoration-blue-600/30 underline-offset-4 transition-colors hover:text-blue-800 hover:decoration-blue-800"
          target={href.startsWith('http') ? '_blank' : undefined}
          rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
        >
          {children}
        </a>
      );
    },
  },
  types: {
    code: ({ value }: { value: PortableTextCodeBlock }) => (
      <figure className="my-4">
        {value.filename && <figcaption className="mb-2 text-sm uppercase text-slate-500">{value.filename}</figcaption>}
        <pre className="overflow-x-auto rounded-2xl bg-slate-950 p-5 text-sm leading-6 text-slate-100">
          <code className="font-mono whitespace-pre-wrap">{value.code ?? ''}</code>
        </pre>
      </figure>
    ),
    codeBlock: ({ value }: { value: PortableTextCodeBlock }) => (
      <figure className="my-4">
        {value.filename && <figcaption className="mb-2 text-sm uppercase text-slate-500">{value.filename}</figcaption>}
        <div className="overflow-hidden rounded-2xl">
          <SyntaxHighlighter
            language={value.language || 'typescript'}
            style={vscDarkPlus}
            customStyle={{
              margin: 0,
              padding: '1.25rem',
              fontSize: '0.875rem',
              lineHeight: '1.5rem',
            }}
            codeTagProps={{
              style: {
                fontFamily: 'inherit',
              },
            }}
          >
            {value.code ?? ''}
          </SyntaxHighlighter>
        </div>
      </figure>
    ),
  },
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { data } = await client.query({
    query: GET_BLOG_POST,
    variables: { slug_current: slug },
  });

  const post = (data as GetBlogPostData | undefined)?.allBlogPost?.[0];

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

  return data.allBlogPost.map((post) => ({
    slug: post?.slug?.current ?? '',
  }));
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
    <Layout>
      <article className="mx-auto flex w-full max-w-4xl flex-col gap-6 py-8">
        <header className="flex flex-col gap-3">
          <Typography variant="h1">{post.title}</Typography>
          <Typography variant="body2" className="uppercase">
            {post.publishedAt ? formatPublishDate(post.publishedAt) : 'Unpublished'}
          </Typography>
        </header>
        <section className="flex flex-col gap-4">
          <PortableText
            value={(post.bodyRaw ?? []) as Array<PortableTextBlock | PortableTextCodeBlock>}
            components={portableTextComponents}
          />
        </section>
      </article>
    </Layout>
  );
}
