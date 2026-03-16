import { gql } from '@apollo/client';

import type { BlogPostSummary } from './GetBlogPosts';

export type PortableTextBlock = {
  _type: 'block';
  _key?: string;
  style?: string;
  children?: Array<{
    text?: string;
    marks?: string[];
  }>;
};

export type PortableTextCodeBlock = {
  _type: 'code' | 'codeBlock';
  _key?: string;
  code?: string;
  language?: string;
  filename?: string;
};

export type BlogPostDetail = BlogPostSummary & {
  bodyRaw?: Array<PortableTextBlock | PortableTextCodeBlock>;
};

export type GetBlogPostData = {
  allBlogPost: BlogPostDetail[];
};

export const GET_BLOG_POST = gql`
  query GetBlogPost($slug_current: String!) {
    allBlogPost(where: { slug: { current: { eq: $slug_current } } }, limit: 1) {
      _id
      title
      publishedAt
      bodyRaw
      slug {
        current
      }
    }
  }
`;

export const GET_BLOG_POST_SLUGS = gql`
  query GetBlogPostSlugs {
    allBlogPost {
      slug {
        current
      }
    }
  }
`;
