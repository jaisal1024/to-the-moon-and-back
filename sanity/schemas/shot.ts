import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'shot',
  type: 'document',
  title: 'Shot',
  hidden: true,
  fields: [
    defineField({
      name: 'title',
      type: 'string',
      title: 'Title',
    }),
    defineField({
      name: 'photo',
      type: 'image',
      title: 'Photo',
    }),
  ],
})
