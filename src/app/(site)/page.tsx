import { Metadata } from 'next';
import { listCollections } from 'src/cms/collections';
import { mediaSource } from 'src/cms/media';
import SitePage from 'src/components/site/SitePage';
import { logHomePageCollectionsLoaded, logHomePageCollectionsLoadFailed } from 'src/lib/posthog-logs';
import type { Collection } from 'src/payload-types';

import Home, { HomeCollection, HomePhoto } from './Home';

export const metadata: Metadata = {
  title: 'Jaisal Friedman - Collections',
  description: "Learn more about Jaisal Friedman's photography collections.",
};

export const revalidate = 600; // 10-minutes in seconds

type Shot = NonNullable<Collection['photos']>[number];

function toPhoto(shot: Shot | undefined): HomePhoto | undefined {
  const source = mediaSource(shot?.photo, 'xl');
  if (!source) return undefined;
  const ratio = source.width && source.height ? source.width / source.height : 1.5;
  return { src: source.src, alt: shot?.title?.trim() || source.alt, ratio };
}

const isLandscape = (shot: Shot) => {
  const source = mediaSource(shot.photo);
  return !!source?.width && !!source.height && source.width > source.height;
};

// "2024-02-08T00:00:00.000Z" -> "February 2024" (dates are calendar days, so read them in UTC)
function monthYear(date?: string | null) {
  if (!date) return undefined;
  const d = new Date(`${date.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

// A CMS failure leaves the page without its list rather than failing it.
async function getCollections(): Promise<HomeCollection[]> {
  try {
    const collections = (await listCollections()).map((collection) => {
      const photos = (collection.photos ?? []).filter((shot) => mediaSource(shot.photo));
      // Cover: the collection's first photo. Hero: its first other landscape photo, so the hero
      // never repeats the cover shown in the list below; failing that, its second photo.
      const rest = photos.slice(1);
      const heroShot = rest.find(isLandscape) ?? rest[0] ?? photos[0];
      return {
        title: collection.title,
        href: `/collections/${collection.slug}`,
        location: collection.location ?? undefined,
        date: monthYear(collection.date),
        description: collection.description?.trim() || undefined,
        count: photos.length,
        cover: toPhoto(photos[0]),
        hero: toPhoto(heroShot),
      };
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
