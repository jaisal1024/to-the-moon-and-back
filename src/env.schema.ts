import { z } from 'zod';

// Blank values (`FOO=` in .env) count as unset rather than failing validation.
const optional = z.preprocess((value) => (value === '' ? undefined : value), z.string().min(1).optional());

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  PAYLOAD_SECRET: z.string().min(1),
  // Unset locally: uploads go to ./media instead of Vercel Blob.
  BLOB_READ_WRITE_TOKEN: optional,
  // Authenticates POST /api/revalidateRoute (scripts/revalidate.ts).
  REVALIDATE_SECRET: optional,
  NEXT_PUBLIC_GOOGLE_ANALYTICS_ID: optional,
});

/**
 * Validated server environment. Imported by src/payload.config.ts, so every page,
 * API route, and Payload CLI command fails fast with a clear message when a
 * required variable is missing or malformed.
 */
export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  PAYLOAD_SECRET: process.env.PAYLOAD_SECRET,
  BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
  REVALIDATE_SECRET: process.env.REVALIDATE_SECRET,
  NEXT_PUBLIC_GOOGLE_ANALYTICS_ID: process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID,
});
