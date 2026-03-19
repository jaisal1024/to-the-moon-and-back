import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/setup-tests.ts'],
    globals: true,
    exclude: ['**/node_modules/**', '**/e2e/**'],
    env: {
      NEXT_PUBLIC_SANITY_DATASET: 'development',
      NEXT_PUBLIC_SANITY_API_VERSION: '2022-11-28',
      NEXT_PUBLIC_GOOGLE_ANALYTICS_ID: 'G-KL7CLHPFFB',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'src': path.resolve(__dirname, './src'),
    },
  },
});
