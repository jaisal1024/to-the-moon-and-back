---
name: payload-cms-workflow
description: How to change content models, read CMS data, handle media, and keep pages fresh with Payload CMS in this Next.js site.
---

# Payload CMS Workflow

Payload runs inside this Next.js app. The admin UI is `/admin`, content lives in Postgres (Docker locally, Neon on Vercel), and uploads live in Vercel Blob (local `./media` when `BLOB_READ_WRITE_TOKEN` is unset).

## Changing a collection

Collections live in `src/collections/` and are registered in `src/payload.config.ts`.

1. Edit the collection config.
2. `bun run payload:types` regenerates `src/payload-types.ts`.
3. `bun run migrate:create -- <short_name>` writes a SQL migration to `src/migrations/`.
4. `bun run migrate` applies it locally. Builds apply pending migrations when `DATABASE_URL` is set.
5. If you added custom admin components, `bun run payload:importmap`.
6. Commit the collection, types, and migration together.

Never enable `push` mode or edit generated files (`payload-types.ts`, `migrations/`, `app/(payload)/`) by hand.

## Reading data

- Pages read through `src/cms/*` only. Add a function there rather than calling `getPayload` in a page.
- Every site read passes `overrideAccess: false`, so collection `access.read` rules hide drafts from the public site. Keep it that way.
- Use `select` and `depth` to fetch only what a page renders. Media relations need `depth: 1` to arrive as documents instead of ids.
- Client components receive data as props from server components. Never import `payload` or `@payload-config` in a `'use client'` file.

## Media

Render images with `src/components/NextImage.tsx`, which takes a `Media` document and a size (`thumbnail`, `card`, `large`, `xl`). `mediaSource` in `src/cms/media.ts` falls back to the original when a size was not generated.

## Freshness

- Collection `afterChange` and `afterDelete` hooks in `src/collections/hooks/revalidate.ts` call `revalidatePath` for published documents, including the previous slug. Content shown on every page (the nav's collections) revalidates the whole layout.
- Bulk Local API writes (scripts, imports) pass `context: { skipRevalidate: true }`.
- Pages keep `revalidate = 600` as a safety net. `bun run revalidate <slug>` forces both production domains.

## Local data

`bun run dev-local` starts Postgres, migrates, and seeds an empty database with `scripts/seed.ts`. `bun run migrate:sanity` copies the real Sanity content instead (`SANITY_DATASET=production`); it is kept until Sanity is decommissioned.
