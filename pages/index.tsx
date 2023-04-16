import NextImage from 'components/NextImage'
import { AllSeriesQuery, SanityImageAsset } from 'gql/graphql'

import client from '../apollo-client'
import { graphql } from '../gql/gql'
import type { Image as SanityImage } from 'sanity'

export default function IndexPage({ data }: { data: AllSeriesQuery }) {
  console.log('IndexPage rendering: ', data)
  if (!data) {
    return (
      <>
        <div>¯\_(ツ)_/¯</div>
        <p>
          Your data will show up here when you have configured everything
          correctly
        </p>
        <pre>Unknown Error</pre>
      </>
    )
  }
  const { allSeries: series } = data
  return (
    <>
      <header>
        <h1>Jaisal Friedman</h1>
      </header>
      <main>
        <h2>series</h2>
        {series.length > 0 && (
          <ul>
            {series.map((serie) => (
              <>
                <li key={serie._id}>{serie.title}</li>
                <div className="relative max-w-[200px]">
                  <NextImage
                    image={serie.photos[0].photo as SanityImage} // need to fix with a proper null guard on _type, _ref
                    alt={serie.title}
                  />
                </div>
              </>
            ))}
          </ul>
        )}
        {series.length < 1 && <p>No series to show</p>}
        {series.length > 0 && (
          <div>
            <pre>{JSON.stringify(series, null, 2)}</pre>
          </div>
        )}
        {series.length < 1 && (
          <div>
            <div>¯\_(ツ)_/¯</div>
            <p>
              Your data will show up here when you have configured everything
              correctly
            </p>
          </div>
        )}
      </main>
    </>
  )
}

export async function getStaticProps() {
  console.log('getStaticProps')
  const { data } = await client
    .query({
      query: graphql(/* GraphQL */ `
        query allSeries {
          allSeries {
            _id
            title
            description
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
      console.log('res: ', res)
      return res
    })
    .catch((err) => {
      console.error('error encountered: ', err)
      return {
        data: {},
      }
    })

  console.log('data: ', data)
  return {
    props: {
      data,
    },
  }
}
