import Layout from '../components/Layout'
import NextImage from '../components/NextImage'
import type { Image as SanityImage } from 'sanity'

import client from 'apollo-client'
import { graphql } from 'gql/gql'
import { InferGetStaticPropsType } from 'next/types'

export default function IndexPage({
  data,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  console.debug(`IndexPage rendering: ${data}`)
  if (!data) {
    return (
      <Layout>
        <div>¯\_(ツ)_/¯</div>
        <p>
          Your data will show up here when you have configured everything
          correctly
        </p>
        <pre>Unknown Error</pre>
      </Layout>
    )
  }
  const { allCollections: collections } = data
  return (
    <Layout>
      <h2>collections</h2>
      {collections.length > 0 && (
        <ul>
          {collections.map((collection) => (
            <div key={collection._id}>
              <li> {collection.title}</li>
              <div className="relative max-w-[200px]">
                <NextImage
                  image={collection.photos[0].photo as SanityImage} // need to fix with a proper null guard on _type, _ref
                  alt={collection.title}
                />
              </div>
            </div>
          ))}
        </ul>
      )}
      {collections.length < 1 && <p>No collections to show</p>}
      {collections.length > 0 && (
        <div>
          <pre>{JSON.stringify(collections, null, 2)}</pre>
        </div>
      )}
      {collections.length < 1 && (
        <div>
          <div>¯\_(ツ)_/¯</div>
          <p>
            Your data will show up here when you have configured everything
            correctly
          </p>
        </div>
      )}
    </Layout>
  )
}

export async function getStaticProps() {
  const { data } = await client
    .query({
      query: graphql(/* GraphQL */ `
        query GetCollections {
          allCollections(limit: 10, offset: 0, sort: { _createdAt: DESC }) {
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
      `),
    })
    .then((res) => {
      return res
    })
    .catch((err) => {
      throw new Error('getStatisProps failed for index.tsx', err)
    })

  console.debug(`getStaticProps index.tsx data: ${data}`)
  return {
    props: {
      data,
    },
  }
}
