import { Metadata } from 'next';

import SiteDocument from './SiteDocument';

export const metadata: Metadata = {
  title: 'Jaisal Friedman',
  description: 'Jaisal Friedman - Home',
  icons: {
    icon: [
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
  },
  alternates: {
    canonical: 'https://www.jaisal.xyz',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <SiteDocument>{children}</SiteDocument>;
}
