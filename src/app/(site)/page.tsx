import { Metadata } from 'next';
import { listCollections } from 'src/cms/collections';
import ImageGrid from 'src/components/ImageGrid';
import Layout from 'src/components/Layout';

export const metadata: Metadata = {
  title: 'Jaisal Friedman - Collections',
  description: "Learn more about Jaisal Friedman's photography collections.",
};

export const revalidate = 600; // 10-minutes in seconds

export default async function IndexPage() {
  const collections = await listCollections();

  // Each collection is represented on the homepage by its first photo.
  const covers = collections.flatMap((collection) => {
    const cover = collection.photos?.[0];
    if (!cover) return [];
    return [
      {
        key: collection.id,
        title: collection.title,
        photo: cover.photo,
        button: { title: collection.title, href: `/collections/${collection.slug}` },
      },
    ];
  });

  return <Layout>{covers.length > 0 ? <ImageGrid collection={covers} /> : <h1>No collections to show.</h1>}</Layout>;
}
