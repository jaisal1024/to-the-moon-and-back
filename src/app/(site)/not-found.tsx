import { clsx } from 'clsx';
import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import shell from 'src/components/site/site.module.css';
import SitePage from 'src/components/site/SitePage';

import styles from './notFound.module.css';

export const metadata: Metadata = {
  title: 'Jaisal Friedman - 404',
};

// The /about hero, reduced: one line, one way home, one matted photo, the number at the bottom.
// Static on purpose: this page must render even when the CMS is unreachable.
export default function NotFound() {
  return (
    <SitePage>
      <section className={styles.hero}>
        <div className={styles.lines}>
          <p>Page Not Found</p>
          <p>
            <Link className={clsx(shell.u, styles.home)} href="/">
              Collections <span className={styles.arrow}>→</span>
            </Link>
          </p>
        </div>
        <div className={clsx(shell.frame, styles.frame)}>
          <div className={shell.inner}>
            <Image
              src="/images/site/not-found.jpg"
              alt="Underneath the construction"
              fill
              preload
              sizes="(max-width: 720px) 80vw, 27vw"
            />
          </div>
        </div>
        <h1 data-testid="not-found-heading">404</h1>
      </section>
    </SitePage>
  );
}
