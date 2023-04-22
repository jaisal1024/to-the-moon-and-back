import 'src/styles/globals.css'

import { ApolloProvider } from '@apollo/client'
import client from 'apollo-client'
import { AppProps } from 'next/app'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <ApolloProvider client={client}>
        <Component {...pageProps} />
      </ApolloProvider>
    </>
  )
}
