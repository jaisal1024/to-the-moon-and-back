import type { CodegenConfig } from '@graphql-codegen/cli'
import * as dotenv from 'dotenv'

// Load environment variables from .env file
dotenv.config()

const config: CodegenConfig = {
  overwrite: true,
  schema: process.env.SANITY_GRAPHQL_SCHEMA_URL,
  documents: '{components,pages}/**/*.{tsx,ts}',
  generates: {
    './gql/': {
      preset: 'client',
      plugins: [],
    },
  },
}

export default config
