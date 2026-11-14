import { type CollectionConfig, slugField } from 'payload';

import { sanityIdField } from '../fields/sanityId';
import type { Collection } from '../payload-types';
import { rememberPublished, revalidateAfterChange, revalidateAfterDelete } from './hooks/revalidate';

type CollectionDoc = Pick<Collection, 'slug' | '_status'>;

// Collections appear on the homepage, the about page, their own page, and as the
// "next collection" on other collection pages, so revalidate the whole site layout.
const collectionPaths = () => ['/'];

/** A photography series. Each array row in `photos` is one shot. */
export const Collections: CollectionConfig = {
  slug: 'collections',
  labels: { singular: 'Collection', plural: 'Collections' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'location', 'date', '_status'],
  },
  access: {
    // Anonymous visitors only see published collections.
    read: ({ req }) => (req.user ? true : { _status: { equals: 'published' } }),
  },
  defaultSort: '-createdAt',
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
      name: 'description',
      type: 'text',
    },
    {
      type: 'row',
      fields: [
        {
          name: 'date',
          type: 'date',
          admin: { date: { pickerAppearance: 'monthOnly', displayFormat: 'MMMM yyyy' } },
        },
        {
          name: 'location',
          type: 'text',
        },
      ],
    },
    {
      name: 'photos',
      type: 'array',
      labels: { singular: 'Photo', plural: 'Photos' },
      admin: { initCollapsed: true },
      fields: [
        {
          name: 'photo',
          type: 'upload',
          relationTo: 'media',
          required: true,
        },
        {
          name: 'title',
          type: 'text',
        },
      ],
    },
  ],
  hooks: {
    beforeChange: [rememberPublished],
    afterChange: [revalidateAfterChange<CollectionDoc>(collectionPaths, { type: 'layout' })],
    afterDelete: [revalidateAfterDelete<CollectionDoc>(collectionPaths, { type: 'layout' })],
  },
};
