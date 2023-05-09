import { Typography } from '@mui/material';
import client from 'apollo-client';
import {
  GetStaticPathsResult,
  GetStaticPropsContext,
  InferGetStaticPropsType,
} from 'next';
import ImageGrid from 'src/components/ImageGrid';
import Layout from 'src/components/Layout';
import PageTitle from 'src/components/PageTitle';
import { graphql } from 'src/gql/gql';
import { GET_COLLECTION } from 'src/queries/GetCollection';

export default function SeriesIdPage({
  collection,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  return (
    <>
      <PageTitle
        title={`Jaisal Friedman - ${collection.title}`}
        description={`Learn more about Jaisal Friedman's photography collection ${collection.title}.`}
      />
      <Layout>
        <div className="flex flex-row pb-4">
          <div>
            <Typography variant="h1">{collection.title}</Typography>
            <Typography variant="h3">{collection.description}</Typography>
          </div>
          <div className="ml-auto flex flex-col items-end pr-2 text-end">
            <Typography variant="h3">
              {new Date(collection.date).toLocaleDateString('en-us', {
                year: 'numeric',
                month: 'long',
              })}
            </Typography>
            <Typography variant="h3">{collection.location}</Typography>
          </div>
        </div>
        <ImageGrid collection={collection.photos} />
      </Layout>
    </>
  );
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
    );
  }
  console.log('running getStaticProps for collection id:', context.params.id);
  const slug =
    typeof context.params.id === 'string'
      ? context.params.id
      : context.params.id[0];
  const { data } = await client
    .query({
      query: GET_COLLECTION,
      variables: { slug_current: slug },
    })
    .catch((err) => {
      console.error('getStaticProps failed', err);
      throw err;
    });
  if (!data) {
    throw new Error(
      `getStaticProps empty return value for collection id: ${slug}`
    );
  }
  const collection = data.allCollections[0];
  return {
    props: {
      collection,
    },
    revalidate: 600, // 10-minutes in seconds
  };
}

export async function getStaticPaths(): Promise<GetStaticPathsResult> {
  console.log('running getStaticPaths for collection id route');
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
      console.error('getStaticPaths failed', err);
      throw err;
    });
  if (!data) {
    // will invalidate all new builds and error out
    throw new Error('getStaticPaths empty return value');
  }

  return {
    paths: data.allCollections.map((collection) => ({
      params: { id: collection?.slug.current ?? '' }, // shouldn't happen could be bad if it starts null'ing out
    })),
    fallback: 'blocking', // force a rebuild if the path doesn't exist
  };
}
