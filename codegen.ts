import type { CodegenConfig } from '@graphql-codegen/cli';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const config: CodegenConfig = {
  overwrite: true,
  schema: process.env.NEXT_PUBLIC_SANITY_GRAPHQL_SCHEMA_URL,
  documents: ['!src/(gql)/*', 'src/**/*.{graphql,ts,tsx}'],
  generates: {
    './src/gql/': {
      preset: 'client',
      plugins: [],
    },
  },
};

export default config;
