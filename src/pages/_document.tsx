import { useTheme } from '@mui/material'
import { Head, Html, Main, NextScript } from 'next/document'

export default function Document() {
  const theme = useTheme()
  return (
    <Html lang="en">
      <Head>
        <link rel="stylesheet" href="https://use.typekit.net/oug8zzb.css" />
      </Head>
      <body style={{ backgroundColor: theme.palette.background.default }}>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
