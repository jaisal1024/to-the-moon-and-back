import {
  createTheme,
  PaletteMode,
  responsiveFontSizes,
  ThemeOptions,
} from '@mui/material';

import { carbon, dangerRed, paleTangerine, tangerine, white } from './colors';

const baseTypography: ThemeOptions['typography'] = {
  fontFamily:
    'var(--font-dm-sans), system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  h1: {
    fontSize: 36,
    fontWeight: 700,
    textTransform: 'uppercase',
    fontFamily:
      'var(--font-archivo-black), system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  h2: {
    fontSize: 28,
    lineHeight: 1.3,
    fontWeight: 600,
    textTransform: 'uppercase',
    fontFamily:
      'var(--font-dm-sans), system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  h3: {
    fontFamily:
      'var(--font-dm-sans), system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontSize: 22,
    lineHeight: 1.3,
    fontWeight: 400,
  },
  h4: {
    fontFamily:
      'var(--font-dm-sans), system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontSize: 20,
    lineHeight: 1.3,
    fontWeight: 500,
  },
  subtitle1: {
    fontSize: 48,
    lineHeight: 1.3,
    fontWeight: 700,
    fontFamily:
      'var(--font-dm-sans), system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  body1: {
    fontFamily:
      'var(--font-dm-sans), system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontSize: 16,
    fontWeight: 300,
  },
  body2: {
    fontFamily:
      'var(--font-dm-sans), system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontSize: 14,
    fontWeight: 300,
  },
};

export const createAppTheme = (mode: PaletteMode) =>
  responsiveFontSizes(
    createTheme({
      palette: {
        mode,
        primary: {
          main: mode === 'light' ? white : tangerine,
        },
        secondary: {
          main: mode === 'light' ? carbon : paleTangerine,
        },
        error: {
          main: dangerRed,
        },
        background: {
          default: mode === 'light' ? white : carbon,
          paper: mode === 'light' ? paleTangerine : '#303030',
        },
        text: {
          primary: mode === 'light' ? carbon : white,
          secondary: mode === 'light' ? carbon : paleTangerine,
        },
      },
      typography: baseTypography,
    }),
  );
