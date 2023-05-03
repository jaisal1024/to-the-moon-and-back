import 'src/styles/globals.css'

import { ApolloProvider } from '@apollo/client'
import { ThemeProvider } from '@mui/material'
import client from 'apollo-client'
import { AppProps } from 'next/app'
import Head from 'next/head'
import PageTitle from 'src/components/PageTitle'
import { theme } from 'src/theme'

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
          <Component {...pageProps} />
        </ApolloProvider>
      </ThemeProvider>
    </>
  )
}
