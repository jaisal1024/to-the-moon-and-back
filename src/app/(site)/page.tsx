import client from 'apollo-client';
import { Metadata } from 'next';
import type { Image as SanityImage } from 'sanity';
import SitePage from 'src/components/site/SitePage';
import { logHomePageCollectionsLoaded, logHomePageCollectionsLoadFailed } from 'src/lib/posthog-logs';
import { GET_COLLECTIONS } from 'src/queries/GetCollections';
import { urlForImage } from 'src/sanity/lib/image';
import { GET_COLLECTIONS_SORT } from 'src/utils/constants';

import Home, { HomeCollection, HomePhoto } from './Home';

export const metadata: Metadata = {
  title: 'Jaisal Friedman - Collections',
  description: "Learn more about Jaisal Friedman's photography collections.",
};

export const revalidate = 600; // 10-minutes in seconds

type CmsPhoto = {
  title?: string | null;
  photo?: {
    asset?: { metadata?: { dimensions?: { width?: number | null; height?: number | null } | null } | null } | null;
  } | null;
} | null;

function toPhoto(entry: CmsPhoto, width: number): HomePhoto | undefined {
  const url = entry?.photo
    ? urlForImage(entry.photo as SanityImage)
        ?.width(width)
        .url()
    : undefined;
  if (!url) return undefined;
  const dims = entry?.photo?.asset?.metadata?.dimensions;
  const ratio = dims?.width && dims?.height ? dims.width / dims.height : 1.5;
  return { src: url, alt: entry?.title ?? '', ratio };
}

// "2024-02-08" -> "February 2024" (dates are calendar days, so read them in UTC)
function monthYear(date?: string | null) {
  if (!date) return undefined;
  const d = new Date(`${date.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

// A CMS failure leaves the page without its list rather than failing it.
async function getCollections(): Promise<HomeCollection[]> {
  try {
    const { data } = await client.query({
      query: GET_COLLECTIONS,
      variables: { offset: 0, sort: GET_COLLECTIONS_SORT, limit: 20 },
    });
    const collections = (data?.allCollections ?? []).flatMap((collection) => {
      const slug = collection.slug?.current;
      if (!collection.title || !slug) return [];
      const photos = (collection.photos ?? []).filter((p) => p?.photo);
      // Cover: the collection's first photo. Hero: its first other landscape photo, so the hero
      // never repeats the cover shown in the list below; failing that, its second photo.
      const rest = photos.slice(1);
      const isLandscape = (p: CmsPhoto) => {
        const d = p?.photo?.asset?.metadata?.dimensions;
        return !!d?.width && !!d?.height && d.width > d.height;
      };
      const heroEntry = rest.find(isLandscape) ?? rest[0] ?? photos[0];
      return [
        {
          title: collection.title,
          href: `/collections/${slug}`,
          location: collection.location ?? undefined,
          date: monthYear(collection.date),
          description: collection.description?.trim() || undefined,
          count: photos.length,
          cover: toPhoto(photos[0], 1800),
          hero: toPhoto(heroEntry, 1800),
        },
      ];
    });
    logHomePageCollectionsLoaded(collections.length);
    return collections;
  } catch (err) {
    console.error('Failed to load collections for the home page', err);
    logHomePageCollectionsLoadFailed();
    return [];
  }
}

export default async function IndexPage() {
  const collections = await getCollections();

  return (
    <SitePage>
      <Home collections={collections} />
    </SitePage>
  );
}
