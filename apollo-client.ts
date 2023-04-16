import { ApolloClient, InMemoryCache } from '@apollo/client'

const client = new ApolloClient({
  connectToDevTools: true,
  uri: 'https://6qd0txmw.api.sanity.io/v1/graphql/development/default',
  cache: new InMemoryCache(),
})

export default client
