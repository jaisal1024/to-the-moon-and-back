import { z } from 'zod';

// Blank values (`FOO=` in .env) count as unset rather than failing validation.
const blankToUndefined = (value: unknown) => (value === '' ? undefined : value);
const optional = z.preprocess(blankToUndefined, z.string().min(1).optional());
const optionalUrl = z.preprocess(blankToUndefined, z.string().url().optional());

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  PAYLOAD_SECRET: z.string().min(1),
  // Vercel sets this from the Blob store; locally it is the emulator token from .env.example.
  // Unset entirely, uploads fall back to ./media on disk.
  BLOB_READ_WRITE_TOKEN: optional,
  // Only set locally, to point the Blob SDK and file URLs at the Docker emulator.
  VERCEL_BLOB_API_URL: optionalUrl,
  NEXT_PUBLIC_VERCEL_BLOB_API_URL: optionalUrl,
  STORAGE_VERCEL_BLOB_BASE_URL: optionalUrl,
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
  VERCEL_BLOB_API_URL: process.env.VERCEL_BLOB_API_URL,
  NEXT_PUBLIC_VERCEL_BLOB_API_URL: process.env.NEXT_PUBLIC_VERCEL_BLOB_API_URL,
  STORAGE_VERCEL_BLOB_BASE_URL: process.env.STORAGE_VERCEL_BLOB_BASE_URL,
  REVALIDATE_SECRET: process.env.REVALIDATE_SECRET,
  NEXT_PUBLIC_GOOGLE_ANALYTICS_ID: process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID,
});
