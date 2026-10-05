# Data Flow & Content Management

## Overview

Content is authored in the Payload admin at `/admin` and stored in Postgres, with photos in Vercel Blob. Pages read it in-process through Payload's Local API at build time (SSG) and serve it with ISR. There is no separate CMS service and no client-side data fetching.

---

## Content Model

Collections live in `src/collections/` and are registered in `src/payload.config.ts`. See [architecture.md](./architecture.md#content-model) for every field.

| Collection    | Holds                                                                                 |
| ------------- | ------------------------------------------------------------------------------------- |
| `collections` | Photography series: title, slug, description, month, location, and an array of photos |
| `posts`       | Blog posts: title, slug, publish date, and a Lexical rich text body with code blocks  |
| `media`       | Uploaded photos, with four generated sizes                                            |
| `users`       | Admin accounts                                                                        |

`collections` and `posts` have drafts. Their `access.read` rules let anonymous readers see published documents only.

---

## Reading Data

Pages never call Payload directly. They use the typed functions in `src/cms/`:

| Function                         | Used by                                    |
| -------------------------------- | ------------------------------------------ |
| `listCollections`                | `/` (homepage grid)                        |
| `listNavCollections`             | `Layout` → `NavBar` on every page          |
| `getCollectionBySlug`            | `/collections/[id]` page and metadata      |
| `listCollectionSlugs`            | `/collections/[id]` `generateStaticParams` |
| `listPosts`                      | `/blog`                                    |
| `getPostBySlug`, `listPostSlugs` | `/blog/[slug]`                             |
| `mediaSource`                    | `NextImage`, to pick a generated size      |

Every function passes `overrideAccess: false`, so the public site runs with anonymous access rules even though the Local API could bypass them. Types come from the generated `src/payload-types.ts`.

---

## Rendering Lifecycle

### Build time

```
bun run build
  → payload migrate (when DATABASE_URL is set)
  → next build
      → /                    listCollections → ImageGrid of cover photos
      → /collections/[id]    generateStaticParams → listCollectionSlugs
                             page → getCollectionBySlug
      → /blog, /blog/[slug]  listPosts, listPostSlugs, getPostBySlug → PostBody (Lexical → JSX)
      → every page           Layout → listNavCollections → NavBar
```

### Runtime

Pages are served from the static cache and revalidate after **10 minutes** (`revalidate = 600`) as a safety net. Edits show up immediately through on-demand revalidation:

```
Edit in /admin → Payload afterChange/afterDelete hook → revalidatePath(...) → next request regenerates
```

- Collections revalidate the whole site layout, because the nav lists them on every page.
- Posts revalidate `/blog` and `/blog/<slug>`.
- Saving a draft does not revalidate anything. Publishing, unpublishing, and slug changes do, including the old URL.

`POST /api/revalidateRoute` with a `secret` header matching `REVALIDATE_SECRET` forces a path manually. `bun run revalidate <slug>` calls it for both production domains.

---

## Images

1. An upload to `media` is stored in Vercel Blob, or in `./media` locally when no Blob token is set.
2. sharp generates `thumbnail` (400px), `card` (800px), `large` (1600px), and `xl` (2400px), keeping the aspect ratio and never upscaling.
3. `NextImage` takes a `Media` document, uses the requested size with its intrinsic dimensions, and lets `next/image` handle format and responsive variants.

---

## Local Data

```
bun run dev-local
  → docker compose up postgres:18
  → payload migrate
  → seed (sample collections and a post, only into an empty database)
  → next dev on http://localhost:3333
```

For real content, run `SANITY_DATASET=production bun run migrate:sanity` against the local database. It copies the original Sanity content and can be re-run safely.
