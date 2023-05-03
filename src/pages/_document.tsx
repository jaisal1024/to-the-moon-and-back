import { useTheme } from '@mui/material'
import { Head, Html, Main, NextScript } from 'next/document'

export default function Document() {
  const theme = useTheme()
  return (
    <Html lang="en">
      <Head>
        <link rel="stylesheet" href="https://use.typekit.net/oug8zzb.css" />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/favicon-16x16.png"
        />
      </Head>
      <body style={{ backgroundColor: theme.palette.background.default }}>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
