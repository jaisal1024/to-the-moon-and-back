import { SchemaTypeDefinition } from 'sanity'

import Series from './schemas/series'
import Shot from './schemas/shot'

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [Series, Shot],
}
