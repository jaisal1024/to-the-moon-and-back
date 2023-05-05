import { defineArrayMember, defineField, defineType } from 'sanity';

export default defineType({
  name: 'collections',
  type: 'document',
  title: 'Collections',
  fields: [
    defineField({
      name: 'title',
      type: 'string',
      title: 'Title',
    }),
    defineField({
      title: 'Slug',
      name: 'slug',
      type: 'slug',
      options: {
        source: 'title',
      },
    }),
    defineField({
      name: 'description',
      type: 'string',
      title: 'Description',
    }),
    defineField({
      name: 'date',
      type: 'date',
      title: 'Date',
    }),
    defineField({
      name: 'location',
      type: 'string',
      title: 'Location',
    }),
    defineField({
      name: 'photos',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'shot',
        }),
      ],
      title: 'Photos',
    }),
  ],
});
