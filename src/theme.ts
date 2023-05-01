import { createTheme, responsiveFontSizes } from '@mui/material'

import { carbon, dangerRed, white } from './colors'

export const theme = responsiveFontSizes(
  createTheme({
    palette: {
      primary: {
        main: white,
      },
      secondary: {
        main: carbon,
      },
      error: {
        main: dangerRed,
      },
      background: {
        default: white,
      },
    },
    typography: {
      fontFamily: 'proxima-nova, sans-serif',
      h1: {
        fontSize: 36,
        fontWeight: 700,
        fontStyle: 'normal',
        textTransform: 'uppercase',
      },
      h2: {
        fontSize: 30,
        lineHeight: 1.3,
        fontWeight: 700,
        fontStyle: 'normal',
        textTransform: 'uppercase',
      },
      h3: {
        fontSize: 24,
        lineHeight: 1.3,
        fontStyle: 'normal',
        fontWeight: 400,
      },
      h4: {
        fontSize: 20,
        lineHeight: 1.3,
        fontStyle: 'normal',
        fontWeight: 400,
      },
      body1: { fontSize: 16, fontStyle: 'normal', fontWeight: 300 },
      body2: { fontSize: 14, fontStyle: 'normal', fontWeight: 300 },
    },
  })
)

export default theme
