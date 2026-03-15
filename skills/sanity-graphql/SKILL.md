---
name: sanity-graphql-workflow
description: Best practices and patterns for working with Sanity CMS and its GraphQL API in this Next.js project, including schema changes, query patterns, image handling, and ISR revalidation.
---

# Sanity + GraphQL Workflow

## Schema Changes Workflow

Whenever you modify schema files in `src/sanity/schemas/`:

1. **Update the schema file** (`collections.ts` or `shot.ts`)
2. **Deploy the schema** to Sanity's hosted GraphQL endpoint:
   ```bash
   yarn graphql-deploy
   ```
3. **Regenerate TypeScript types**:
   ```bash
   yarn generate
   ```
4. **Restart the dev server** — changes won't be reflected until restart

> ⚠️ Forgetting `yarn graphql-deploy` is a very common mistake. Without it, local type generation will fail or produce stale types.

---

## Sanity GraphQL Quirks

### Use `allCollections` for slug filtering

The Sanity GraphQL `collection` top-level query only accepts internal document IDs, not slugs. Always use `allCollections` with a `where` filter for slug-based lookup:

```graphql
# ✅ Correct – filter by slug
query GetCollection($slug: String!) {
  allCollections(where: { slug: { current: { eq: $slug } } }, limit: 1) { ... }
}

# ❌ Incorrect – the `collection` query requires document ID
query GetCollection($id: ID!) {
  collection(id: $id) { ... }
}
```

### No sub-query element limits

Sanity's GraphQL API doesn't support `limit` on sub-query elements (e.g., you can't do `photos(limit: 1)` inside `allCollections`). If you only need the cover photo, you must fetch all photos and take the first in code.

### Array fields must be top-level document types

Sanity requires array elements to be registered as top-level `document` types when using the GraphQL API. This is why `Shot` is defined as a `document` (even though it's only used as an embedded type in `Collection`).

---

## Query Patterns

### Adding a New Query

1. Create a new file in `src/queries/` or add inline in the component
2. Use the `graphql()` tag from `src/gql/gql`:
   ```ts
   import { graphql } from 'src/gql/gql';
   export const MY_QUERY = graphql(/* GraphQL */ `query MyQuery { ... }`);
   ```
3. `graphql-codegen` will detect the query and generate typed hooks on next `yarn generate` or in watch mode during `yarn dev`

### Inline Queries

For component-specific queries that aren't reused, define them inline in the component file (see `NavBar.tsx` for an example).

### Always Type Query Results

Use the generated types from `src/gql/graphql.ts`:

```ts
import { GetCollectionsQuery } from 'src/gql/graphql';
function MyComponent({ data }: { data: GetCollectionsQuery }) { ... }
```

---

## Sanity Image Handling

Sanity images are stored as asset references, not direct URLs. Use the `NextImage` wrapper component — **never** use `next/image` directly with Sanity assets:

```tsx
// ✅ Correct
import NextImage from 'src/components/NextImage';
<NextImage image={photo} alt="description" fill />

// ❌ Wrong — skips the URL transformation
<Image src={photo.asset.url} alt="description" fill />
```

The `NextImage` component uses `@sanity/image-url` to build optimized CDN URLs from the Sanity asset reference.

---

## ISR Revalidation

### On-Demand Revalidation Flow

```
Sanity edit → Webhook → POST /api/revalidate (with signature) → res.revalidate('/affected-path')
```

- The `/api/revalidate` route verifies the `REVALIDATE_SECRET` before revalidating
- On success, the page is regenerated on the next request
- Without this, pages update on the next 10-minute ISR cycle

### Revalidation Route Logic

The `revalidate.ts` API route (`src/pages/api/revalidate.ts`) determines which routes to revalidate based on the document type in the webhook payload. Collection updates trigger revalidation of:

- `/` (homepage)
- `/collections/[slug]` (specific collection page)

### Local ISR Testing

You must run a **production build** to test ISR locally — `next dev` doesn't support ISR:

```bash
yarn build && yarn start   # production server
yarn ngrok-start           # expose to internet for webhook
```

---

## Sanity Studio (Embedded)

The Sanity Studio is embedded at the `/studio` route via `src/pages/studio/[[...index]].tsx`.

Configuration is in `sanity.config.ts` at the root. The schema is defined by `src/sanity/schema.ts` which aggregates all types from `src/sanity/schemas/`.

---

## Data Migration

Avoid renaming `_type` fields in Sanity documents — it requires a manual migration. If unavoidable, use the script at `scripts/migrateDocumentType.js`. Always back up data first.
