import { listNavCollections } from 'src/cms/collections';

import Footer from './Footer';
import NavBar from './NavBar';

export default async function Layout({ children }: { children: React.ReactNode }) {
  const collections = await listNavCollections();
  return (
    <>
      <header>
        <NavBar collections={collections} />
      </header>
      <main className="p-4">{children}</main>
      <footer>
        <Footer />
      </footer>
    </>
  );
}
