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
      fontFamily: 'DM Sans, sans-serif',
      fontSize: 14,
      h1: {
        fontFamily: 'Graphik XCond Trial',
        fontSize: 34,
        fontWeight: 700,
        lineHeight: 1.5,
        textTransform: 'uppercase',
      },
      h2: {
        fontFamily: 'Graphik XCond Trial',
        fontSize: 30,
        lineHeight: 1.3,
        fontWeight: 500,
        textTransform: 'uppercase',
      },
      h3: {
        fontSize: 24,
        lineHeight: 1.3,
        fontWeight: 400,
      },
      h4: {
        fontSize: 20,
        lineHeight: 1.3,
        fontWeight: 400,
      },
      body1: { fontSize: 16 },
      body2: { fontSize: 14 },
    },
  })
)

export default theme
