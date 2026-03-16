import * as colors from './src/colors';

/** @type {import('tailwindcss').Config} */
module.exports = {
  important: true,
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ...colors,
        borderSubtle: 'var(--color-border-subtle)',
        borderStrong: 'var(--color-border-strong)',
        surface: 'var(--color-surface-default)',
        surfaceElevated: 'var(--color-surface-elevated)',
        textStrong: 'var(--color-text-strong)',
        textMuted: 'var(--color-text-muted)',
        accentPrimary: 'var(--color-accent-primary)',
        accentLink: 'var(--color-accent-link)',
      },
    },
  },
  plugins: [],
};
