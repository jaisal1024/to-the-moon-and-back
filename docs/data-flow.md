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

| Function                         | Used by                                                      |
| -------------------------------- | ------------------------------------------------------------ |
| `listCollections`                | `/`, `/about`, and the collection page's next-collection row |
| `getCollectionBySlug`            | `/collections/[id]` page and metadata                        |
| `listCollectionSlugs`            | `/collections/[id]` `generateStaticParams`                   |
| `listPosts`                      | `/blog`                                                      |
| `getPostBySlug`, `listPostSlugs` | `/blog/[slug]`                                               |
| `mediaSource`                    | Pages, to pick a generated size and its dimensions           |

Each `page.tsx` maps the documents to the plain props its client component takes (`Home`, `About`, `Collection`, `BlogIndex`, `Post`), so the presentation knows nothing about the CMS.

Every function passes `overrideAccess: false`, so the public site runs with anonymous access rules even though the Local API could bypass them. Types come from the generated `src/payload-types.ts`.

---

## Rendering Lifecycle

### Build time

```
pnpm run build
  → payload migrate (when DATABASE_URL is set)
  → next build
      → /, /about            listCollections → Home, About
      → /collections/[id]    generateStaticParams → listCollectionSlugs
                             page → getCollectionBySlug, listCollections (next collection)
      → /blog, /blog/[slug]  listPosts, listPostSlugs, getPostBySlug → lexicalToRichBlocks → Post
```

### Runtime

Pages are served from the static cache and revalidate after **10 minutes** (`revalidate = 600`) as a safety net. Edits show up immediately through on-demand revalidation:

```
Edit in /admin → Payload afterChange/afterDelete hook → revalidatePath(...) → next request regenerates
```

- Collections revalidate the whole site layout, because a collection shows on the homepage, the about page, its own page, and other collections' "next" link.
- Posts revalidate `/blog` and `/blog/<slug>`.
- Saving a draft does not revalidate anything. Publishing, unpublishing, and slug changes do, including the old URL.

`POST /api/revalidateRoute` with a `secret` header matching `REVALIDATE_SECRET` forces a path manually. `pnpm run revalidate <slug>` calls it for both production domains.

---

## Images

1. An upload to `media` is stored in Vercel Blob, or in `./media` locally when no Blob token is set.
2. sharp generates `thumbnail` (400px), `card` (800px), `large` (1600px), and `xl` (2400px), keeping the aspect ratio and never upscaling.
3. Pages call `mediaSource(media, size)` for the URL and intrinsic dimensions of a generated size, and pass them as plain props; the components render them with `next/image`, which handles format and responsive variants.

---

## Local Data

```
pnpm run dev-local
  → docker compose up postgres:18
  → payload migrate
  → seed (sample collections and a post, only into an empty database)
  → next dev on http://localhost:3333
```

For real content, run `SANITY_DATASET=production pnpm run migrate:sanity` against the local database. It copies the original Sanity content and can be re-run safely.
