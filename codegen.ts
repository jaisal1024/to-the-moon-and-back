import type { CodegenConfig } from '@graphql-codegen/cli'

const config: CodegenConfig = {
  overwrite: true,
  schema: 'https://6qd0txmw.api.sanity.io/v1/graphql/development/default',
  documents: '{components,pages}/**/*.tsx',
  generates: {
    './gql/': {
      preset: 'client',
      plugins: [],
    },
  },
}

export default config
