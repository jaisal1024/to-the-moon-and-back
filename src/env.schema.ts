import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_SANITY_PROJECT_ID: z.string().min(1),
  NEXT_PUBLIC_SANITY_DATASET: z.string().min(1),
  NEXT_PUBLIC_SANITY_API_VERSION: z.string().min(1),
  NEXT_PUBLIC_SANITY_GRAPHQL_SCHEMA_URL: z.string().url(),
  SANITY_API_TOKEN: z.string().min(1).optional(),
  REVALIDATE_SECRET: z.string().min(1).optional(),
  SANITY_WEBHOOK_SECRET: z.string().min(1).optional(),
  NEXT_PUBLIC_GOOGLE_ANALYTICS_ID: z.string().min(1).optional(),
  // Payload CMS. Optional until the site reads content from Payload.
  DATABASE_URL: z.string().url().optional(),
  PAYLOAD_SECRET: z.string().min(1).optional(),
  BLOB_READ_WRITE_TOKEN: z.string().min(1).optional(),
});

export const env = envSchema.parse({
  NEXT_PUBLIC_SANITY_PROJECT_ID: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  NEXT_PUBLIC_SANITY_DATASET: process.env.NEXT_PUBLIC_SANITY_DATASET,
  NEXT_PUBLIC_SANITY_API_VERSION: process.env.NEXT_PUBLIC_SANITY_API_VERSION,
  NEXT_PUBLIC_SANITY_GRAPHQL_SCHEMA_URL: process.env.NEXT_PUBLIC_SANITY_GRAPHQL_SCHEMA_URL,
  SANITY_API_TOKEN: process.env.SANITY_API_TOKEN,
  REVALIDATE_SECRET: process.env.REVALIDATE_SECRET,
  SANITY_WEBHOOK_SECRET: process.env.SANITY_WEBHOOK_SECRET,
  NEXT_PUBLIC_GOOGLE_ANALYTICS_ID: process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID,
  DATABASE_URL: process.env.DATABASE_URL,
  PAYLOAD_SECRET: process.env.PAYLOAD_SECRET,
  BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
});
