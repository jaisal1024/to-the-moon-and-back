import { Typography } from '@mui/material';
import client from 'apollo-client';
import { Metadata } from 'next';
import ImageGrid from 'src/components/ImageGrid';
import Layout from 'src/components/Layout';
import PageTitle from 'src/components/PageTitle';
import { graphql } from 'src/gql/gql';
import { GET_COLLECTION } from 'src/queries/GetCollection';

export const revalidate = 600; // 10-minutes in seconds

type Props = {
  params: Promise<{ id: string }>;
};

// Next.js App Router dynamic metadata generation
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const { data } = await client.query({
    query: GET_COLLECTION,
    variables: { slug_current: id },
  });

  const collection = data?.allCollections?.[0];

  return {
    title: `Jaisal Friedman - ${collection?.title ?? 'Collection'}`,
    description: `Learn more about Jaisal Friedman's photography collection ${collection?.title ?? ''}.`,
  };
}

export async function generateStaticParams() {
  const { data } = await client
    .query({
      query: graphql(`
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
      console.error('generateStaticParams failed', err);
      return { data: null };
    });

  if (!data) return [];

  return data.allCollections.map((collection) => ({
    id: collection?.slug.current ?? '',
  }));
}

export default async function SeriesIdPage({ params }: Props) {
  const { id } = await params;
  
  const { data } = await client
    .query({
      query: GET_COLLECTION,
      variables: { slug_current: id },
    })
    .catch((err) => {
      console.error('Data fetch failed', err);
      throw err;
    });

  if (!data?.allCollections?.length) {
    throw new Error(`Data fetch empty return value for collection id: ${id}`);
  }

  const collection = data.allCollections[0];

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
