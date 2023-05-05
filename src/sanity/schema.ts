import { SchemaTypeDefinition } from 'sanity';

import Collections from './schemas/collections';
import Shot from './schemas/shot';

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [Collections, Shot],
};
