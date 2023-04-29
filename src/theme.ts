import { createTheme } from '@mui/material'

import { carbon, dangerRed, white } from './colors'

export const theme = createTheme({
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
      fontSize: '34px',
      letterSpacing: '0.15rem',
      fontWeight: 700,
      lineHeight: '123%',
      textTransform: 'uppercase',
    },
    h2: {
      fontFamily: 'Graphik XCond Trial',
      fontSize: '30px',
      letterSpacing: '0.1rem',
      fontWeight: 700,
      lineHeight: '135%',
      textTransform: 'uppercase',
    },
    h3: {
      fontFamily: 'Graphik XCond Trial',
      fontSize: '26px',
      letterSpacing: '0.1rem',
      fontWeight: 700,
      lineHeight: '100%',
      textTransform: 'uppercase',
    },
    body1: { fontSize: '16px', lineHeight: '150%' },
    body2: { fontSize: '14px', lineHeight: '150%' },
    subtitle1: { fontSize: '12px', lineHeight: '150%' },
  },
})

export default theme
