import { ApolloClient, InMemoryCache } from '@apollo/client';

// Use the CDN network for client side requests
const constructSanityGraphQLUrlCdn = () => {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET;
  return `https://${projectId}.apicdn.sanity.io/v1/graphql/${dataset}/default`;
};

const client = new ApolloClient({
  uri:
    typeof window !== undefined
      ? constructSanityGraphQLUrlCdn()
      : process.env.NEXT_PUBLIC_SANITY_GRAPHQL_SCHEMA_URL,
  cache: new InMemoryCache(),
});

export default client;
