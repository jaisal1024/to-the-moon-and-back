import { Metadata } from 'next';
import { listCollections } from 'src/cms/collections';
import { mediaSource } from 'src/cms/media';
import SitePage from 'src/components/site/SitePage';

import About, { AboutCollection } from './About';

export const metadata: Metadata = {
  title: 'Jaisal Friedman - About',
  description: 'Learn more about me!',
};

export const revalidate = 600; // 10-minutes in seconds

// The collections index is a secondary part of this page, so a CMS failure hides it rather than failing the page.
async function getCollections(): Promise<AboutCollection[]> {
  try {
    return (await listCollections()).map((collection) => ({
      title: collection.title,
      href: `/collections/${collection.slug}`,
      photo: mediaSource(collection.photos?.[0]?.photo, 'card')?.src,
    }));
  } catch (err) {
    console.error('Failed to load collections for the about page', err);
    return [];
  }
}

export default async function AboutPage() {
  const collections = await getCollections();

  return (
    <SitePage>
      <About collections={collections} />
    </SitePage>
  );
}
