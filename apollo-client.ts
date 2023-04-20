import { ApolloClient, InMemoryCache } from '@apollo/client'

const client = new ApolloClient({
  connectToDevTools: true,
  uri: process.env.SANITY_GRAPHQL_SCHEMA_URL,
  cache: new InMemoryCache(),
})

export default client
