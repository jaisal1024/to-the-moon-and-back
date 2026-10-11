// Shared <html> shell for the public site: fonts, theme bootstrap, providers, analytics.
// Used by the (site) root layout and by app/global-not-found.tsx, which bypasses layouts.
import 'src/styles/globals.css';
import 'src/styles/animate.css';

import { Archivo_Black, DM_Sans } from 'next/font/google';
import Script from 'next/script';

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

export default function SiteDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${archivoBlack.variable} ${dmSans.variable}`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var search = window.location.search || '';
                  var params = new URLSearchParams(search);
                  var override = params.get('theme');
                  var isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                  var theme = isDark ? 'dark' : 'light';

                  if (override === 'light' || override === 'dark') {
                    theme = override;
                  }

                  document.documentElement.setAttribute('data-theme', theme);
                } catch (e) {
                  document.documentElement.setAttribute('data-theme', 'light');
                }
              })();
            `,
          }}
        />
      </head>
      <body>
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
