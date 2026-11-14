import { gql } from '@apollo/client';
import client from 'apollo-client';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { Image as SanityImage } from 'sanity';
import SitePage from 'src/components/site/SitePage';
import { GET_COLLECTION } from 'src/queries/GetCollection';
import { GET_COLLECTIONS } from 'src/queries/GetCollections';
import { urlForImage } from 'src/sanity/lib/image';
import { GET_COLLECTIONS_SORT } from 'src/utils/constants';

import Collection, { type CollectionPhoto, type NextCollection } from './Collection';

export const revalidate = 600; // 10-minutes in seconds

type Props = {
  params: Promise<{ id: string }>;
};

async function getCollection(id: string) {
  const { data } = await client
    .query({
      query: GET_COLLECTION,
      variables: { slug_current: id },
    })
    .catch((err) => {
      console.error('Data fetch failed', err);
      throw err;
    });
  return data?.allCollections?.[0];
}

// Next.js App Router dynamic metadata generation
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const collection = await getCollection(id).catch(() => undefined);

  return {
    title: `Jaisal Friedman - ${collection?.title ?? 'Collection'}`,
    description: `Learn more about Jaisal Friedman's photography collection ${collection?.title ?? ''}.`,
  };
}

export async function generateStaticParams() {
  const { data } = await client
    .query<{ allCollections: Array<{ slug?: { current?: string } }> }>({
      query: gql`
        query GetCollectionSlugs {
          allCollections {
            slug {
              current
            }
          }
        }
      `,
    })
    .catch((err) => {
      console.error('generateStaticParams failed', err);
      return { data: null };
    });

  if (!data) return [];

  return data.allCollections.map((collection) => ({
    id: collection?.slug?.current ?? '',
  }));
}

// "Next collection" is the one after this in the collections index, wrapping to the first.
// It is secondary, so a CMS failure hides it rather than failing the page.
async function getNextCollection(id: string): Promise<NextCollection | undefined> {
  try {
    const { data } = await client.query({
      query: GET_COLLECTIONS,
      variables: { offset: 0, sort: GET_COLLECTIONS_SORT, limit: 20 },
    });
    const all = (data?.allCollections ?? []).filter((c) => c.title && c.slug?.current);
    const index = all.findIndex((c) => c.slug?.current === id);
    if (index < 0 || all.length < 2) return undefined;
    const nextIndex = (index + 1) % all.length;
    const next = all[nextIndex];
    const cover = next.photos?.[0]?.photo;
    return {
      number: String(nextIndex + 1).padStart(2, '0'),
      title: next.title ?? '',
      href: `/collections/${next.slug?.current}`,
      location: next.location ?? undefined,
      date: next.date ?? undefined,
      cover: cover
        ? urlForImage(cover as SanityImage)
            ?.width(1200)
            .url()
        : undefined,
    };
  } catch (err) {
    console.error('Failed to load the next collection', err);
    return undefined;
  }
}

export default async function CollectionPage({ params }: Props) {
  const { id } = await params;
  const [collection, next] = await Promise.all([getCollection(id), getNextCollection(id)]);

  if (!collection?.title) notFound();

  // Plain props: the page component knows nothing about the CMS.
  const photos: CollectionPhoto[] = (collection.photos ?? []).flatMap((item) => {
    const photo = item?.photo;
    const src = photo
      ? urlForImage(photo as SanityImage)
          ?.width(2400)
          .url()
      : undefined;
    if (!photo || !src) return [];
    const dims = photo.asset?.metadata?.dimensions;
    return [{ src, title: item?.title?.trim() ?? '', width: dims?.width ?? 3, height: dims?.height ?? 2 }];
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
