import Layout from 'components/Layout'
import NextImage from 'components/NextImage'
import { InferGetStaticPropsType } from 'next'
import type { Image as SanityImage } from 'sanity'

import client from '../../apollo-client'
import { graphql } from '../../gql/gql'

export default function SeriesIdPage({
  data,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  console.debug(`CollectionId rendering: ${data}`)
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
  const { collection } = data
  return (
    <Layout>
      <h1>A Photo Series: </h1>
      <div>
        <h4>{collection.title}</h4>
        <h6>{collection.description}</h6>
        <div className="relative max-w-[200px]">
          <NextImage
            image={collection.photos[0].photo as SanityImage} // need to fix with a proper null guard on _type, _ref
            alt={collection.title}
          />
        </div>
      </div>
    </Layout>
  )
}

export async function getStaticProps({ context }) {
  if (!!context.id || !(typeof context.id !== 'string')) {
    throw new Error('context.id missing in getStaticProps')
  }
  const collection_id = context.id as string
  const { data } = await client
    .query({
      query: graphql(/* GraphQL */ `
        query collection {
          Collections(id: "${collection_id}") {
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
      `),
    })
    .then((res) => {
      return res
    })
    .catch((err) => {
      throw new Error(
        `getStaticProps failed for collection id: ${collection_id}`,
        err
      )
    })
  if (!data) {
    throw new Error(
      `getStaticProps empty return value for collection id: ${collection_id}`
    )
  }
  console.debug(`getStaticProps for ${collection_id} data: ${data}`)
  return {
    props: {
      data,
    },
  }
}
