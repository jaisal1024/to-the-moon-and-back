import 'src/styles/globals.css';
import 'src/styles/animate.css';

import { ApolloProvider } from '@apollo/client';
import { ThemeProvider } from '@mui/material';
import client from 'apollo-client';
import { AppProps } from 'next/app';
import Head from 'next/head';
import Script from 'next/script';
import PageTitle from 'src/components/PageTitle';
import { theme } from 'src/theme';


const googleAnalyticsId = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID;

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <ThemeProvider theme={theme}>
        <ApolloProvider client={client}>
          <PageTitle />
          <Head>
            <meta charSet="utf-8" />
            <meta
              name="viewport"
              content="initial-scale=1.0, width=device-width"
            />
          </Head>
          {/* Google tag (gtag.js) */}
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`}
            async
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());

              gtag('config', '${googleAnalyticsId}');
            `}
          </Script>
          <Component {...pageProps} />
        </ApolloProvider>
      </ThemeProvider>
    </>
  );
}
