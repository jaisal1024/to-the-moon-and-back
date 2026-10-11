import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { postgresAdapter } from '@payloadcms/db-postgres';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob';
import { buildConfig } from 'payload';
import sharp from 'sharp';

import { Collections } from './collections/Collections';
import { Media } from './collections/Media';
import { Posts } from './collections/Posts';
import { Users } from './collections/Users';

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Media, Collections, Posts],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
    // Schema changes ship as committed migrations; never auto-push in shared databases.
    push: false,
    migrationDir: path.resolve(dirname, 'migrations'),
  }),
  sharp,
  plugins: [
    // Stores uploads in Vercel Blob when BLOB_READ_WRITE_TOKEN is set; otherwise
    // Payload falls back to local disk (./media), which is what local dev uses.
    vercelBlobStorage({
      token: process.env.BLOB_READ_WRITE_TOKEN,
      // Serve files straight from Blob instead of proxying every image through
      // a Payload API route; media is public-read anyway.
      collections: { media: { disablePayloadAccessControl: true } },
      // Keep the schema identical with or without a token so migrations match.
      alwaysInsertFields: true,
      // No addRandomSuffix: with image sizes it overwrites the stored filename and
      // breaks size URLs. Payload already de-duplicates filenames against the database.
      // Upload from the browser straight to Blob; full-size photos exceed
      // Vercel's 4.5 MB function request body limit.
      clientUploads: true,
    }),
  ],
});
