import 'src/styles/globals.css';
import 'src/styles/animate.css';

import { Metadata } from 'next';
import { Archivo_Black, DM_Sans } from 'next/font/google';
import Script from 'next/script';
import { theme } from 'src/theme';

import { Providers } from './Providers';

const archivoBlack = Archivo_Black({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-archivo-black',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-dm-sans',
});

const googleAnalyticsId = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID;

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${archivoBlack.variable} ${dmSans.variable}`}>
      <head />
      <body style={{ backgroundColor: theme.palette.background.default }}>
        <Providers>
          {/* Google tag (gtag.js) */}
          {googleAnalyticsId && (
            <>
              <Script
                src={`https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`}
                strategy="afterInteractive"
              />
              <Script id="google-analytics" strategy="afterInteractive">
                {`
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());

                  gtag('config', '${googleAnalyticsId}');
                `}
              </Script>
            </>
          )}
          {children}
        </Providers>
      </body>
    </html>
  );
}
