import { gql } from '@apollo/client';

export type BlogPostSummary = {
  _id?: string;
  title?: string;
  publishedAt?: string;
  slug?: {
    current?: string;
  };
};

export type GetBlogPostsData = {
  allBlogPost: BlogPostSummary[];
};

export const GET_BLOG_POSTS = gql`
  query GetBlogPosts {
    allBlogPost(sort: { publishedAt: DESC }) {
      _id
      title
      publishedAt
      slug {
        current
      }
    }
  }
`;
