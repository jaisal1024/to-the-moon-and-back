import type { CodegenConfig } from '@graphql-codegen/cli';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const config: CodegenConfig = {
  overwrite: true,
  // The site no longer has GraphQL queries (it reads Payload directly); keep codegen
  // passing until it is removed along with Apollo.
  ignoreNoDocuments: true,
  schema: process.env.NEXT_PUBLIC_SANITY_GRAPHQL_SCHEMA_URL,
  documents: ['!src/(gql)/*', 'src/**/*.{graphql,ts,tsx}'],
  generates: {
    './src/gql/': {
      preset: 'client',
      config: {
        scalars: {
          Date: 'string',
          DateTime: 'string',
        },
      },
      plugins: [],
    },
  },
};

export default config;
