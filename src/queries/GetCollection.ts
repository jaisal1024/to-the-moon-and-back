import { graphql } from 'src/gql/gql'

export const GET_COLLECTION = graphql(/* GraphQL */ `
  query GetCollection($slug_current: String!) {
    allCollections(
      where: { slug: { current: { eq: $slug_current } } }
      limit: 1
    ) {
      _id
      title
      description
      location
      date
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
