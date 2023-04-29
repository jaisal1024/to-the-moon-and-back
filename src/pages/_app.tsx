import 'src/styles/globals.css'

import { ApolloProvider } from '@apollo/client'
import { ThemeProvider } from '@mui/material'
import client from 'apollo-client'
import { AppProps } from 'next/app'
import { theme } from 'src/theme'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <ThemeProvider theme={theme}>
        <ApolloProvider client={client}>
          <Component {...pageProps} />
        </ApolloProvider>
      </ThemeProvider>
    </>
  )
}
