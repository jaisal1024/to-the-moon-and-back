import bundleAnalyzer from '@next/bundle-analyzer';
import { withPayload } from '@payloadcms/next/withPayload';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

// When media is served by the local Vercel Blob emulator (docker-compose `blob`),
// allow next/image to fetch it. Next 16 refuses to optimize images from private
// IPs by default, so this is enabled only for the emulator, never on Vercel:
// localhost in development, or the `blob` service name inside the CI e2e container.
const blobEmulator = (() => {
  const base = process.env.STORAGE_VERCEL_BLOB_BASE_URL;
  if (!base) return null;
  const url = new URL(base);
  return ['localhost', '127.0.0.1', 'blob'].includes(url.hostname) ? url : null;
})();

// The public host of this environment's Blob store, derived from its token the same way
// @payloadcms/storage-vercel-blob builds file URLs. Allowing only this host stops
// next/image from optimizing images out of anyone else's Blob store.
const blobStoreHost = (() => {
  if (blobEmulator) return null;
  const storeId = process.env.BLOB_READ_WRITE_TOKEN?.match(/^vercel_blob_rw_([a-z\d]+)_[a-z\d]+$/i)?.[1];
  return storeId ? `${storeId.toLowerCase()}.public.blob.vercel-storage.com` : null;
})();

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      // Payload media stored in this project's Vercel Blob store only.
      ...(blobStoreHost ? [{ protocol: 'https', hostname: blobStoreHost }] : []),
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
