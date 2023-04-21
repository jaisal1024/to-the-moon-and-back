import { graphql } from 'src/gql/gql'
import { GET_COLLECTIONS_SORT } from 'src/utils/constants'

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
`)
