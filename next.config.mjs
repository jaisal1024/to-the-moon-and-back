import bundleAnalyzer from '@next/bundle-analyzer';
import { withPayload } from '@payloadcms/next/withPayload';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

// When media is served by the local Vercel Blob emulator (docker-compose `blob`),
// allow next/image to fetch it. Next 16 refuses to optimize images from private
// IPs by default, so this is enabled only for a localhost emulator, never on Vercel.
const blobEmulator = (() => {
  const base = process.env.STORAGE_VERCEL_BLOB_BASE_URL;
  if (!base) return null;
  const url = new URL(base);
  return ['localhost', '127.0.0.1'].includes(url.hostname) ? url : null;
})();

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        // Payload media stored in Vercel Blob.
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
      },
      ...(blobEmulator
        ? [
            {
              protocol: blobEmulator.protocol.replace(':', ''),
              hostname: blobEmulator.hostname,
              port: blobEmulator.port,
            },
          ]
        : []),
    ],
    dangerouslyAllowLocalIP: Boolean(blobEmulator),
  },
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
