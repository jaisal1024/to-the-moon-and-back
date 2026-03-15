import { Metadata } from 'next';
import Script from 'next/script';
import { theme } from 'src/theme';
import { Providers } from './Providers';
import 'src/styles/globals.css';
import 'src/styles/animate.css';

const googleAnalyticsId = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID;

export const metadata: Metadata = {
  title: 'Jaisal Friedman',
  description: 'Jaisal Friedman - Photography and Software Engineering',
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
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://use.typekit.net/oug8zzb.css" />
      </head>
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
