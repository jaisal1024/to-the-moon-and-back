import { SchemaTypeDefinition } from 'sanity';

import BlogPost from './schemas/blogPost';
import codeBlock from './schemas/codeBlock';
import Collections from './schemas/collections';
import Shot from './schemas/shot';

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [BlogPost, codeBlock, Collections, Shot],
};
