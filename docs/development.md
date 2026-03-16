# Development Guide

## Prerequisites

- Node.js >= 18 (see `.nvmrc`)
- Yarn (package manager)
- Access to the Sanity project (ask Jaisal for credentials)

---

## Setup

```bash
nvm use          # switch to correct node version
yarn install     # install dependencies
cp .env.example .env  # fill in env variables
```

Required `.env` values:

- `NEXT_PUBLIC_SANITY_PROJECT_ID`
- `NEXT_PUBLIC_SANITY_DATASET`
- `NEXT_PUBLIC_SANITY_API_VERSION`
- `NEXT_PUBLIC_SANITY_GRAPHQL_SCHEMA_URL`
- `SANITY_API_TOKEN` (for revalidation / local scripts)
- `REVALIDATE_SECRET` (optional, used for local ISR scripts)
- `SANITY_WEBHOOK_SECRET` (optional, used by `/api/revalidate`)

---

## Development Server

```bash
yarn dev
```

This runs **two processes concurrently**:

1. `next dev` on port `3333`
2. `graphql-codegen --watch` on `src/**/*.{ts,tsx}`

Visit:

- [http://localhost:3333](http://localhost:3333) — main site
- [http://localhost:3333/studio](http://localhost:3333/studio) — embedded Sanity Studio

---

## GraphQL Workflow

### Modifying the Sanity Schema

1. Edit schema files in `src/sanity/schemas/`
2. Deploy the schema to the hosted GraphQL endpoint:
   ```bash
   yarn graphql-deploy
   ```
3. Regenerate TypeScript types:
   ```bash
   yarn generate
   ```
4. Restart the dev server

### Modifying GraphQL Queries

1. Edit or add queries in `src/queries/`
2. The `codegen --watch` process (running in `yarn dev`) auto-regenerates types
3. Types appear in `src/gql/graphql.ts`

---

## Adding or Updating Content

1. Open the Studio at `/studio`
2. Create or edit a **Collection**
3. Add **Shots** (photos) to the collection
4. If running locally with ISR: set up ngrok (see below)

---

## ISR + Local Webhook Testing

To test incremental static regeneration locally:

```bash
# Terminal 1 — production build (ISR requires a production server)
yarn build && yarn start

# Terminal 2 — expose localhost via ngrok
yarn ngrok-start
```

Then:

1. Copy the ngrok HTTPS URL
2. Add it as a webhook in the [Sanity webhook UI](https://www.sanity.io/manage)
3. Make an edit in Studio and watch the console for revalidation logs

---

## Code Quality

| Command           | What it does                            |
| ----------------- | --------------------------------------- |
| `yarn lint`       | Run ESLint directly (`eslint .`)        |
| `yarn lint:fix`   | Fix ESLint issues + run Prettier        |
| `yarn format`     | Run Prettier on all files               |
| `yarn type-check` | Run `tsc --noEmit` (type checking only) |

---

## Build & Deploy

```bash
yarn build    # builds the production Next.js app
yarn start    # starts the production server locally
```

**Deployment**: Pushing to `main` triggers an automatic deploy on Vercel. CI is optimized with caching for `.next/cache` and Playwright browsers to ensure sub-5 minute build times.

---

## Bundle Analysis

```bash
yarn analyze
```

Opens a visual bundle analyzer to inspect client/server bundle sizes.

---

## Known Quirks & Gotchas

1. **Sanity GraphQL limitations**: `allCollections` must be used instead of `collection` when filtering by slug, because Sanity's `collection` query only accepts document IDs
2. **No per-photo limit in collection queries**: Sanity doesn't support sub-query element limits in GraphQL. The homepage fetches all photos for each collection (only uses the first photo for the cover image), which is expensive
3. **AnimatedSpan timing**: If you change the CSS animation duration in `src/styles/animate.css`, update `transitionTotal` in `AnimatedSpan.tsx` to match (it should be half the CSS duration since the animation alternates)
4. **Sanity data migrations**: Renaming `_type` fields requires using the migration script at `scripts/migrateDocumentType.js`. Use with extreme caution
5. **Sanity Image + NextImage**: Sanity image references need to go through `@sanity/image-url` before passing to `next/image`. See `NextImage.tsx` for the pattern
6. **Font loading**: Fonts are loaded via `next/font` in `src/app/layout.tsx`:
   - `Archivo Black` for the main hero heading
   - `DM Sans` for all other headings and body text
