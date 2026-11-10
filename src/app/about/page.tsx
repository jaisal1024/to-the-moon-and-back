import client from 'apollo-client';
import { Metadata } from 'next';
import { Geist } from 'next/font/google';
import type { Image as SanityImage } from 'sanity';
import Footer from 'src/components/Footer';
import NavBar from 'src/components/NavBar';
import { GET_COLLECTIONS } from 'src/queries/GetCollections';
import { urlForImage } from 'src/sanity/lib/image';
import { GET_COLLECTIONS_SORT } from 'src/utils/constants';

import About, { AboutCollection } from './About';
import styles from './about.module.css';

const geist = Geist({
  subsets: ['latin'],
  weight: ['600'],
  variable: '--font-geist',
});

export const metadata: Metadata = {
  title: 'Jaisal Friedman - About',
  description: 'Learn more about me!',
};

export const revalidate = 600; // 10-minutes in seconds

// The collections index is a secondary part of this page, so a CMS failure hides it rather than failing the page.
async function getCollections(): Promise<AboutCollection[]> {
  try {
    const { data } = await client.query({
      query: GET_COLLECTIONS,
      variables: { offset: 0, sort: GET_COLLECTIONS_SORT, limit: 20 },
    });
    return (data?.allCollections ?? []).flatMap((collection) => {
      const slug = collection.slug?.current;
      if (!collection.title || !slug) return [];
      const photo = collection.photos?.[0]?.photo;
      return [
        {
          title: collection.title,
          href: `/collections/${slug}`,
          photo: photo ? urlForImage(photo as SanityImage)?.width(800).url() : undefined,
        },
      ];
    });
  } catch (err) {
    console.error('Failed to load collections for the about page', err);
    return [];
  }
}

export default async function AboutPage() {
  const collections = await getCollections();

  return (
    <div className={`${geist.variable} ${styles.page}`}>
      <header>
        <NavBar />
      </header>
      <main className={styles.main}>
        <About collections={collections} />
      </main>
      <footer>
        <Footer />
      </footer>
    </div>
  );
}
