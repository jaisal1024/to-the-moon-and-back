import { clsx } from 'clsx';
import { Geist } from 'next/font/google';

import styles from './site.module.css';
import SiteFooter from './SiteFooter';
import TopBar from './TopBar';

const geist = Geist({
  subsets: ['latin'],
  weight: ['500', '600'],
  variable: '--font-geist',
});

// Page frame shared by every public page: tokens, font, the floating top bar and the footer.
export default function SitePage({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={clsx(geist.variable, styles.site)}>
      <TopBar />
      <main className={className}>{children}</main>
      <SiteFooter />
    </div>
  );
}
