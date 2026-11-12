import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCollectionBySlug, listCollections, listCollectionSlugs } from 'src/cms/collections';
import { mediaSource } from 'src/cms/media';
import SitePage from 'src/components/site/SitePage';

import Collection, { type CollectionPhoto, type NextCollection } from './Collection';

export const revalidate = 600; // 10-minutes in seconds

type Props = {
  params: Promise<{ id: string }>;
};

// Next.js App Router dynamic metadata generation
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const collection = await getCollectionBySlug(id).catch(() => null);

  return {
    title: `Jaisal Friedman - ${collection?.title ?? 'Collection'}`,
    description: `Learn more about Jaisal Friedman's photography collection ${collection?.title ?? ''}.`,
  };
}

export async function generateStaticParams() {
  const slugs = await listCollectionSlugs().catch((err) => {
    console.error('generateStaticParams failed', err);
    return [];
  });
  return slugs.map((id) => ({ id }));
}

// "Next collection" is the one after this in the collections index, wrapping to the first.
// It is secondary, so a CMS failure hides it rather than failing the page.
async function getNextCollection(id: string): Promise<NextCollection | undefined> {
  try {
    const all = await listCollections();
    const index = all.findIndex((c) => c.slug === id);
    if (index < 0 || all.length < 2) return undefined;
    const nextIndex = (index + 1) % all.length;
    const next = all[nextIndex];
    return {
      number: String(nextIndex + 1).padStart(2, '0'),
      title: next.title,
      href: `/collections/${next.slug}`,
      location: next.location ?? undefined,
      date: next.date ?? undefined,
      cover: mediaSource(next.photos?.[0]?.photo, 'large')?.src,
    };
  } catch (err) {
    console.error('Failed to load the next collection', err);
    return undefined;
  }
}

export default async function CollectionPage({ params }: Props) {
  const { id } = await params;
  const [collection, next] = await Promise.all([
    getCollectionBySlug(id).catch((err) => {
      console.error('Data fetch failed', err);
      throw err;
    }),
    getNextCollection(id),
  ]);

  if (!collection) notFound();

  // Plain props: the page component knows nothing about the CMS.
  const photos: CollectionPhoto[] = (collection.photos ?? []).flatMap((shot) => {
    const source = mediaSource(shot.photo, 'xl');
    if (!source) return [];
    return [
      {
        src: source.src,
        title: shot.title?.trim() ?? '',
        width: source.width ?? 3,
        height: source.height ?? 2,
        blurDataURL: source.blurDataURL,
      },
    ];
  });

  return (
    <SitePage>
      <Collection
        title={collection.title}
        description={collection.description ?? undefined}
        location={collection.location ?? undefined}
        date={collection.date ?? undefined}
        photos={photos}
        next={next}
      />
    </SitePage>
  );
}
