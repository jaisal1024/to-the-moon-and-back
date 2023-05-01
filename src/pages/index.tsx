import client from 'apollo-client'
import { InferGetStaticPropsType } from 'next/types'
import type { Image as SanityImage } from 'sanity'
import Layout from 'src/components/Layout'
import NextImage from 'src/components/NextImage'
import { SortOrder } from 'src/gql/graphql'
import { GET_COLLECTIONS } from 'src/queries/GetCollections'

export default function IndexPage({
  data,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  console.debug(`IndexPage rendering: ${data}`)
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
      {collections.length < 1 && (
        <h1>
          <div>¯\_(ツ)_/¯</div>
          <h3>
            Error encountered while loading all collections. Please try again.
          </h3>
        </h1>
      )}
    </Layout>
  )
}

export async function getStaticProps() {
  const { data } = await client
    .query({
      query: GET_COLLECTIONS,
      variables: {
        offset: 0,
        sort: { _createdAt: SortOrder.Desc },
      },
    })
    .catch((err) => {
      console.error('getStaticProps failed for index.tsx', err)
      throw err
    })

  console.debug(`getStaticProps index.tsx data: ${data}`)
  return {
    props: {
      data,
    },
  }
}
