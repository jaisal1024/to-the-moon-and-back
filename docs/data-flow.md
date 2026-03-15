# Data Flow & Content Management

## Overview

Content is authored in Sanity Studio and served via a **Sanity-hosted GraphQL API**. The Next.js app fetches this data at build time (SSG) and caches it with ISR. Client-side data fetching is used sparingly (e.g., NavBar lazy collection loading).

---

## Data Sources

### Sanity CMS

The Sanity project hosts two document types:

#### `collections` (Primary content type)

| Field         | Type     | Notes                                          |
| ------------- | -------- | ---------------------------------------------- |
| `title`       | `string` | Collection title, also used to generate `slug` |
| `slug`        | `slug`   | Auto-generated from title; used as URL param   |
| `description` | `string` | Short blurb                                    |
| `date`        | `date`   | Shooting date                                  |
| `location`    | `string` | Where it was shot                              |
| `photos`      | `shot[]` | Array of Shot documents                        |

#### `shot` (Sub-document, hidden in Studio)

| Field   | Type     | Notes                           |
| ------- | -------- | ------------------------------- |
| `title` | `string` | Optional caption                |
| `photo` | `image`  | Sanity image asset (CDN-hosted) |

> ⚠️ Sanity's GraphQL API requires array elements to be top-level `document` types. That's why `Shot` exists as a named document type even though it isn't useful standalone.

---

## GraphQL Layer

### Schema Deployment

The Sanity GraphQL API schema must be explicitly deployed:

```bash
yarn graphql-deploy
```

After deploying, **restart the dev server** for changes to be reflected.

### Code Generation

TypeScript types are auto-generated from the live GraphQL schema using `graphql-codegen`:

```bash
yarn generate  # one-time
yarn dev       # also runs codegen in --watch mode
```

Generated types are written to `src/gql/graphql.ts` and the helper `src/gql/gql.ts`.

### Queries

| Query                  | File                                          | Used In                             |
| ---------------------- | --------------------------------------------- | ----------------------------------- |
| `GetCollections`       | `src/queries/GetCollections.ts`               | `src/app/page.tsx` (Home page)      |
| `GetCollection`        | `src/queries/GetCollection.ts`                | `src/app/collections/[id]/page.tsx` |
| `GetNavBarCollections` | Inline in `src/components/NavBar.tsx`         | NavBar dropdown                     |
| `GetCollectionSlugs`   | Inline in `src/app/collections/[id]/page.tsx` | `generateStaticParams`              |

> All queries use `allCollections` instead of `collection` because Sanity's GraphQL `collection` query requires the document ID, not a slug. Filtering by slug requires using `allCollections(where: { slug: { current: { eq: $slug } } })`.

---

## Rendering Lifecycle

### Build Time (SSG)

```
yarn build
  → IndexPage (src/app/page.tsx)  → Apollo query GetCollections → renders collections
  → SeriesIdPage (src/app/collections/[id]/page.tsx)
      → generateStaticParams → enumerate slugs
      → generateMetadata → dynamic metadata
      → Page Render → Apollo query GetCollection (per slug)
  → about/page.tsx → static
```

### Runtime (ISR)

Pages are served from the static cache. Stale content is revalidated after **10 minutes** (`revalidate: 600`).

On-demand revalidation is triggered by Sanity webhooks:

```
Sanity edit → Webhook POST → /api/revalidate → Next.js revalidates affected route(s)
```

The `/api/revalidate` route is built with Next.js App Router handlers and features strict TypeScript typing (`NextRequest`) and error handling for `unknown` types. It calls `revalidatePath()` or `revalidateTag()` on the affected paths.

---

## Apollo Client Setup

**File:** `apollo-client.ts` (root level)

A singleton Apollo Client instance is created and exported. It is:

- Provided app-wide via `<ApolloProvider>` in `_app.tsx`
- Used directly in `getStaticProps` for SSG (the singleton ensures a single network call)
- Used via `useLazyQuery` in `NavBar` for client-side lazy fetching

```ts
// apollo-client.ts
const client = new ApolloClient({
  uri: `https://${projectId}.api.sanity.io/v1/graphql/${dataset}/default`,
  cache: new InMemoryCache(),
});
```

---

## Sanity Image URLs

Sanity stores images as asset references (`_ref`, `_type`, `url`). The `NextImage` component uses `@sanity/image-url` to build a CDN-optimized URL from the asset reference before passing it to `next/image`.

---

## Development Data Flow

```
Local Sanity Studio (/studio route)
  → Edit collection in Studio
  → Changes saved to Sanity cloud
  → Sanity webhook fires to ngrok tunnel → localhost /api/revalidate
  → ISR forces page regeneration
  → Browser refreshes to see updated content
```

Setup for local ISR verification:

```bash
yarn build && yarn start    # 1. Build & start prod server
yarn ngrok-start            # 2. Expose localhost to internet
# 3. Set ngrok URL in Sanity webhook settings
```
