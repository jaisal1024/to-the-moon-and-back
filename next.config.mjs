import bundleAnalyzer from '@next/bundle-analyzer';
import { withPayload } from '@payloadcms/next/withPayload';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.sanity.io',
      },
      {
        // Payload media stored in Vercel Blob.
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
      },
    ],
  },
  transpilePackages: ['sanity', 'next-sanity', '@sanity/client', 'get-it', 'styled-components'],
  reactStrictMode: true,
  experimental: {
    // Two root layouts, (site) and (payload), need a routing-level 404.
    globalNotFound: true,
  },
  modularizeImports: {
    '@mui/icons-material': {
      transform: '@mui/icons-material/{{member}}',
    },
    'lodash': {
      transform: 'lodash/{{member}}',
    },
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn', 'log'] } : false,
  },
};

export default withPayload(withBundleAnalyzer(nextConfig), { devBundleServerPackages: false });
