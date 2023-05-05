import { graphql } from 'src/gql/gql';

export const GET_COLLECTIONS = graphql(/* GraphQL */ `
  query GetCollections(
    $offset: Int!
    $sort: [CollectionsSorting!]
    $limit: Int = 10
  ) {
    allCollections(offset: $offset, sort: $sort, limit: $limit) {
      _id
      title
      description
      date
      location
      slug {
        current
      }
      photos {
        photo {
          asset {
            url
            _ref: _id
            _type
          }
          _key
        }
        title
      }
    }
  }
`);
