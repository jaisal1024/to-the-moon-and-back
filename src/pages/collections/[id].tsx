import client from 'apollo-client'
import {
  GetStaticPathsResult,
  GetStaticPropsContext,
  InferGetStaticPropsType,
} from 'next'
import type { Image as SanityImage } from 'sanity'
import Layout from 'src/components/Layout'
import NextImage from 'src/components/NextImage'
import { graphql } from 'src/gql/gql'
import { GET_COLLECTION } from 'src/queries/GetCollection'

export default function SeriesIdPage({
  collection,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  console.debug(`CollectionId rendering: ${collection}`)
  if (!collection) {
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

export async function getStaticProps(context: GetStaticPropsContext) {
  if (
    !context.params.id ||
    !(
      (
        typeof context.params.id[0] !== 'string' ||
        context.params.id[0].length > 0
      ) // checks if array type
    )
  ) {
    throw new Error(
      `context.params.id missing in getStaticProps: ${JSON.stringify(
        context.params
      )}`
    )
  }
  console.log('running getStaticProps for collection id: ', context.params.id)
  const slug =
    typeof context.params.id === 'string'
      ? context.params.id
      : context.params.id[0]
  const { data } = await client
    .query({
      query: GET_COLLECTION,
      variables: { slug_current: slug },
    })
    .catch((err) => {
      console.error('getStaticProps failed', err)
      throw err
    })
  if (!data) {
    throw new Error(
      `getStaticProps empty return value for collection id: ${slug}`
    )
  }
  console.debug(`getStaticProps for ${slug} data: ${JSON.stringify(data)}`)
  const collection = data.allCollections[0]
  return {
    props: {
      collection,
    },
  }
}

export async function getStaticPaths(): Promise<GetStaticPathsResult> {
  const { data } = await client
    .query({
      query: graphql(/* GraphQL */ `
        query GetCollectionSlugs {
          allCollections {
            slug {
              current
            }
          }
        }
      `),
    })
    .catch((err) => {
      console.error('getStaticPaths failed', err)
      throw err
    })
  if (!data) {
    throw new Error('getStaticPaths empty return value')
  }

  return {
    paths: data.allCollections.map((collection) => ({
      params: { id: collection?.slug.current ?? '' }, // shouldn't happen could be bad if it starts null'ing out
    })),
    fallback: false,
  }
}
