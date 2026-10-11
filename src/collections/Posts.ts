import {
  BlocksFeature,
  CodeBlock,
  FixedToolbarFeature,
  HeadingFeature,
  lexicalEditor,
  LinkFeature,
} from '@payloadcms/richtext-lexical';
import { type CollectionConfig, slugField } from 'payload';

import { sanityIdField } from '../fields/sanityId';
import type { Post } from '../payload-types';
import { revalidateAfterChange, revalidateAfterDelete } from './hooks/revalidate';

type PostDoc = Pick<Post, 'slug' | '_status'>;

const postPaths = ({ slug }: PostDoc) => ['/blog', ...(slug ? [`/blog/${slug}`] : [])];

/**
 * Keys match the language values Sanity stored, so migrated posts need no
 * remapping. They are valid Monaco ids (admin editor) and Prism ids (site).
 */
const CODE_LANGUAGES = {
  typescript: 'TypeScript',
  tsx: 'TSX',
  javascript: 'JavaScript',
  html: 'HTML',
  css: 'CSS',
  json: 'JSON',
  bash: 'Bash',
} as const;

// The site renderer handles exactly these nodes; uploads, relationships, and
// internal (document) links are left out until the blog needs them.
const EXCLUDED_DEFAULT_FEATURES = new Set(['upload', 'relationship', 'heading', 'checklist', 'link']);

export const Posts: CollectionConfig = {
  slug: 'posts',
  labels: { singular: 'Blog Post', plural: 'Blog Posts' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'publishedAt', '_status'],
  },
  access: {
    read: ({ req }) => (req.user ? true : { _status: { equals: 'published' } }),
  },
  defaultSort: '-publishedAt',
  versions: {
    drafts: true,
  },
  fields: [
    sanityIdField,
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    slugField(),
    {
      name: 'publishedAt',
      type: 'date',
      required: true,
      defaultValue: () => new Date().toISOString(),
      admin: { position: 'sidebar', date: { pickerAppearance: 'dayAndTime' } },
    },
    {
      name: 'body',
      type: 'richText',
      required: true,
      editor: lexicalEditor({
        features: ({ defaultFeatures }) => [
          ...defaultFeatures.filter((feature) => !EXCLUDED_DEFAULT_FEATURES.has(feature.key)),
          HeadingFeature({ enabledHeadingSizes: ['h2', 'h3'] }),
          // URL links only: no enabled collections removes the internal-link option.
          LinkFeature({ enabledCollections: [] }),
          BlocksFeature({
            blocks: [CodeBlock({ defaultLanguage: 'typescript', languages: CODE_LANGUAGES })],
          }),
          FixedToolbarFeature(),
        ],
      }),
    },
  ],
  hooks: {
    afterChange: [revalidateAfterChange<PostDoc>(postPaths)],
    afterDelete: [revalidateAfterDelete<PostDoc>(postPaths)],
  },
};
