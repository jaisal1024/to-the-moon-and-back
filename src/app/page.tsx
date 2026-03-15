import client from 'apollo-client';
import { Metadata } from 'next';
import ImageGrid from 'src/components/ImageGrid';
import Layout from 'src/components/Layout';
import { SortOrder } from 'src/gql/graphql';
import { GET_COLLECTIONS } from 'src/queries/GetCollections';

export const metadata: Metadata = {
  title: 'Jaisal Friedman - Collections',
  description: "Learn more about Jaisal Friedman's photography collections.",
};

export const revalidate = 600; // 10-minutes in seconds

export default async function IndexPage() {
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

  const collections = data.allCollections;

  const mapCollectionsToImageGrid = () => {
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
  };

  return (
    <>
      <Layout>
        {collections.length > 0 && (
          <ImageGrid collection={mapCollectionsToImageGrid()} />
        )}
        {collections.length < 1 && <h1>No collections to show.</h1>}
      </Layout>
    </>
  );
}
