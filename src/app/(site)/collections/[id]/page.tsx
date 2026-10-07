import { Typography } from '@mui/material';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCollectionBySlug, listCollectionSlugs } from 'src/cms/collections';
import ImageGrid from 'src/components/ImageGrid';
import Layout from 'src/components/Layout';

export const revalidate = 600; // 10-minutes in seconds

type Props = {
  params: Promise<{ id: string }>;
};

// Dates are stored as UTC midnight; format in UTC so the month never shifts.
const formatMonth = (date: string) =>
  new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', timeZone: 'UTC' });

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const collection = await getCollectionBySlug(id);

  return {
    title: `Jaisal Friedman - ${collection?.title ?? 'Collection'}`,
    description: `Learn more about Jaisal Friedman's photography collection ${collection?.title ?? ''}.`,
  };
}

export async function generateStaticParams() {
  const slugs = await listCollectionSlugs();
  return slugs.map((id) => ({ id }));
}

export default async function SeriesIdPage({ params }: Props) {
  const { id } = await params;
  const collection = await getCollectionBySlug(id);

  if (!collection) {
    notFound();
  }

  const photos = (collection.photos ?? []).map((row, i) => ({
    key: row.id ?? i,
    title: row.title,
    photo: row.photo,
  }));

  return (
    <Layout>
      <div className="flex flex-row pb-4">
        <div>
          <Typography variant="h1">{collection.title}</Typography>
          <Typography variant="h3">{collection.description}</Typography>
        </div>
        <div className="ml-auto flex flex-col items-end pr-2 text-end">
          {collection.date && <Typography variant="h3">{formatMonth(collection.date)}</Typography>}
          <Typography variant="h3">{collection.location}</Typography>
        </div>
      </div>
      <ImageGrid collection={photos} />
    </Layout>
  );
}
