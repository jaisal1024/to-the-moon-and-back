import client from 'apollo-client';
import { InferGetStaticPropsType } from 'next/types';
import { useCallback } from 'react';
import ImageGrid from 'src/components/ImageGrid';
import Layout from 'src/components/Layout';
import PageTitle from 'src/components/PageTitle';
import { SortOrder } from 'src/gql/graphql';
import { GET_COLLECTIONS } from 'src/queries/GetCollections';

export default function IndexPage({
  data,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  console.debug(`IndexPage rendering: ${JSON.stringify(data, undefined, 2)}`);
  const { allCollections: collections } = data;

  const mapCollectionsToImageGrid = useCallback(() => {
    return collections.map((collection) => {
      return {
        title: collection.title,
        photo: collection.photos[0].photo,
        button: {
          title: collection.title,
          href: `/collections/${collection.slug.current}`,
        },
      };
    });
  }, [collections]);
  return (
    <>
      <PageTitle
        title="Jaisal Friedman - Collections"
        description="Learn more about Jaisal Friedman's photography collections."
      />
      <Layout>
        {collections.length > 0 && (
          <ImageGrid collection={mapCollectionsToImageGrid()} />
        )}
        {collections.length < 1 && <h1>No collections to show.</h1>}
      </Layout>
    </>
  );
}

export async function getStaticProps() {
  console.log('running getStaticProps for / route');
  const { data } = await client
    .query({
      query: GET_COLLECTIONS,
      variables: {
        offset: 0,
        sort: { _createdAt: SortOrder.Desc },
      },
    })
    .catch((err) => {
      console.error('getStaticProps failed for index.tsx', err);
      throw err;
    });

  return {
    props: {
      data,
    },
  };
}
