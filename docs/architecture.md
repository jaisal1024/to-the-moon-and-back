# Architecture

**To the Moon and Back** is Jaisal Friedman's personal photography portfolio and blog: a Next.js site with Payload CMS embedded in the same app, deployed on Vercel. Live at [jaisal.xyz](https://www.jaisal.xyz/) and [jaisalfriedman.com](https://www.jaisalfriedman.com/). The content moved here from Sanity; see [plans/sanity-to-payload-migration.md](./plans/sanity-to-payload-migration.md) for that history.

---

## Technology Stack

| Layer          | Technology                             | Purpose                                                                                                                            |
| -------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Framework      | **Next.js** (App Router)               | SSG + ISR rendering, API routes, hosts both the public site and the CMS                                                            |
| Language       | **TypeScript**                         | Types for app code; `src/payload-types.ts` generated from collections                                                              |
| CMS            | **Payload CMS**                        | Content models, admin UI at `/admin`, Local API, drafts, hooks                                                                     |
| Database       | **Neon Postgres** (Vercel Marketplace) | Content storage via `@payloadcms/db-postgres` (node-postgres `pg`); one Neon branch per environment, Postgres 18 in Docker locally |
| Media storage  | **Vercel Blob**                        | Original photos and generated sizes via `@payloadcms/storage-vercel-blob`                                                          |
| Image pipeline | **sharp** + `next/image`               | Payload generates responsive sizes at upload; Next optimizes on demand                                                             |
| Rich text      | **Lexical**                            | Blog post bodies with a custom `Code` block                                                                                        |
| UI             | **MUI** + **Tailwind CSS**             | Components and typography (MUI); layout and utilities (Tailwind 4)                                                                 |
| Deployment     | **Vercel**                             | Single deployment serves site, admin, and Payload REST API                                                                         |

---

## High-Level Architecture

```
                         ┌──────────────────────────────────────────┐
                         │             Next.js on Vercel            │
                         │                                          │
   Author ──► /admin ───►│  (payload) route group                   │
                         │    Payload admin UI + REST/GraphQL API   │
                         │          │                               │
                         │          │ Local API (in-process)        │
                         │          ▼                               │
                         │  src/cms/*  ◄──── (site) route group     │◄── Visitors
                         │          │        / , /collections/[slug]│
                         │          │        /blog , /blog/[slug]   │
                         └──────────┼──────────────────────────────-┘
                                    │
                 ┌──────────────────┼──────────────────┐
                 ▼                                     ▼
     ┌───────────────────────┐             ┌───────────────────────┐
     │     Neon Postgres     │             │      Vercel Blob      │
     │  (content + versions) │             │ (photos + image sizes)│
     └───────────────────────┘             └───────────────────────┘
```

There is one deployable unit. The CMS has no separate server, no webhook round trip, and no hosted schema to deploy.

---

## Route Groups

`src/app` is split into two route groups, each with its own root layout:

| Group       | Contents                                                                                                                     | Layout                                 |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `(site)`    | `/`, `/about`, `/blog`, `/blog/[slug]`, `/collections/[id]`, `robots.txt`, `sitemap.xml`, `llms.txt`, `/api/revalidateRoute` | MUI theme, Tailwind globals, fonts, GA |
| `(payload)` | `/admin/[[...segments]]`, `/api/[...slug]`, `/api/graphql`                                                                   | Payload's own root layout and styles   |

Keeping them separate prevents MUI, Tailwind resets, and the analytics script from leaking into the admin UI, and keeps the admin bundle out of the public site.

---

## Content Model

Defined in `src/collections/` and registered in `payload.config.ts`.

### `media` (upload collection)

| Field                                | Type | Notes                                                                   |
| ------------------------------------ | ---- | ----------------------------------------------------------------------- |
| `alt`                                | text | Required                                                                |
| `url`, `width`, `height`, `mimeType` | auto | Set by Payload on upload                                                |
| `sizes`                              | auto | `thumbnail` 400w, `card` 800w, `large` 1600w, `xl` 2400w, `fit: inside` |

Files live in Vercel Blob and are public. Media documents are readable by signed-in admins and the site's Local API reads; anonymous REST/GraphQL listing is blocked so photos attached to unpublished drafts cannot be enumerated. Replacing or deleting a photo revalidates the site layout. Admin-only write.

### `collections`

| Field         | Type                        | Notes                                    |
| ------------- | --------------------------- | ---------------------------------------- |
| `title`       | text                        | Required                                 |
| `slug`        | text                        | Unique, indexed, auto-filled from title  |
| `description` | text                        |                                          |
| `date`        | date                        | Shooting date                            |
| `location`    | text                        |                                          |
| `photos`      | array of `{ title, photo }` | `photo` is an upload relation to `media` |

Drafts enabled. `defaultSort: '-createdAt'`. The former `shot` document type no longer exists; an array row is a shot.

### `posts`

| Field         | Type     | Notes                                                                                    |
| ------------- | -------- | ---------------------------------------------------------------------------------------- |
| `title`       | text     | Required                                                                                 |
| `slug`        | text     | Unique, indexed, auto-filled from title                                                  |
| `publishedAt` | date     | Required                                                                                 |
| `body`        | richText | Lexical: h2/h3, bold, italic, inline code, link, and a `Code` block (`language`, `code`) |

Drafts enabled.

### `users` (auth collection)

Single admin account. Only used to log in to `/admin`. On Vercel, anonymous account creation is rejected (closing Payload's public first-user signup), so admins are created with `bun run create-admin` through the Local API. Locally and in CI the normal first-user form still works.

---

## Data Access

All reads go through `src/cms/`, the only module that imports Payload:

```ts
// src/cms/client.ts
export const getCms = cache(() => getPayload({ config }));

// src/cms/collections.ts
listCollections({ limit, depth }); // homepage grid, nav
getCollectionBySlug(slug); // /collections/[id]
listCollectionSlugs(); // generateStaticParams

// src/cms/posts.ts
listPosts() / getPostBySlug(slug) / listPostSlugs();
```

Server components call these directly. There is no client-side data fetching: the NavBar receives its collection list as a prop from the server-rendered `Layout`. Return types come from `src/payload-types.ts`, regenerated with `bun run generate` (no database connection required).

Payload's REST and GraphQL endpoints under `/api/*` exist because the admin UI uses them. App code does not.

---

## Rendering and Revalidation

Pages are statically generated at build and served with ISR (`revalidate = 600`) as a safety net. The primary freshness mechanism is in-process:

```
Author saves in /admin
  → Payload afterChange / afterDelete hook (src/collections/*.ts)
  → collections: revalidatePath('/', 'layout')   (the nav lists collections on every page)
  → posts: revalidatePath('/blog'), revalidatePath('/blog/<slug>')
  → Next regenerates the page on the next request
```

Hooks honor `context.skipRevalidate` so bulk imports do not trigger thousands of revalidations.

`/api/revalidateRoute` remains as a manual escape hatch, authenticated with `REVALIDATE_SECRET`.

---

## Images

1. Author uploads an original to `media`. Payload stores it in Vercel Blob and generates the four sizes with sharp.
2. `NextImage` receives a `Media` document, picks a size (default `xl`; grids pass `sizes` so `next/image` can serve smaller variants), and passes the blob URL plus intrinsic `width`/`height` to `next/image`.
3. Vercel's image optimizer serves the final format and resolution. The Blob hostname is allowed in `next.config.mjs` `remotePatterns`. Files are served straight from Blob, not proxied through Payload's API.

Originals are retained, so sizes can be regenerated if the size set changes.

---

## Build and Deploy

```bash
bun run build
  → payload migrate          # only when DATABASE_URL is set; applies src/migrations/
  → next build               # SSG; reads Neon for generateStaticParams
```

`src/payload-types.ts` and the admin import map are generated ahead of time and committed, so the build does not regenerate them.

Schema changes follow: edit `src/collections/*` → `bun run payload:types` → `bun run migrate:create` → commit the collection, types, and migration together. Production never uses Payload's `push` mode.

Production deploys from release tags, not from merges to `main` (see `RELEASING.md`). Payload connects with the plain `pg` driver via `@payloadcms/db-postgres`; nothing Neon-specific is in the code. Each Vercel environment pairs its own database with its own Blob store: Production uses the Neon `production` branch and the production Blob store; each preview deployment gets a Neon branch forked from `development` and uses the preview Blob store. The Neon integration injects `DATABASE_URL` (pooled), and each store's connection injects `BLOB_READ_WRITE_TOKEN`. CI does not use Neon or Vercel Blob: each job runs `postgres:18` and the Blob emulator as service containers. Locally and in Claude Code cloud sessions, `bun run dev-local` starts the same two containers from `docker-compose.

---

## Styling

The site uses MUI and Tailwind together:

1. **MUI ThemeProvider** (`src/theme.ts`) defines the typography scale, light and dark palettes, and font families. `Archivo Black` is used for the hero `h1` and `DM Sans` for everything else, both loaded with `next/font` in `src/app/(site)/SiteDocument.tsx`.
2. **Tailwind CSS 4** handles layout, spacing, and small utilities. Semantic color tokens for borders, surfaces, text, and accents live in `src/styles/globals.css` under `:root` and `:root[data-theme='dark']` and are exposed to Tailwind through `@theme`.

Payload's admin has its own root layout and styles, so neither MUI nor Tailwind reaches `/admin`.

---

## Environment Variables

Validated in `src/env.schema.ts`.

| Variable                                                                                 | Scope    | Purpose                                                                             |
| ---------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------- |
| `DATABASE_URL`                                                                           | server   | Postgres connection string: Neon pooled URL on Vercel, local Docker URL in `.env`   |
| `PAYLOAD_SECRET`                                                                         | server   | Signs admin sessions. Never exposed to the client.                                  |
| `BLOB_READ_WRITE_TOKEN`                                                                  | server   | Vercel Blob access for uploads; a different store per environment                   |
| `VERCEL_BLOB_API_URL`, `NEXT_PUBLIC_VERCEL_BLOB_API_URL`, `STORAGE_VERCEL_BLOB_BASE_URL` | local/CI | Point the Blob SDK, browser uploads, and file URLs at the emulator. Unset on Vercel |
| `REVALIDATE_SECRET`                                                                      | server   | Auth for `/api/revalidateRoute` and `bun run revalidate`                            |
| `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID`                                                        | public   | Google Analytics measurement ID (optional)                                          |

`DATABASE_URL` and `PAYLOAD_SECRET` are required everywhere the app runs. CI sets throwaway values for its service container.

---

## Key Configuration Files

| File                    | Purpose                                                              |
| ----------------------- | -------------------------------------------------------------------- |
| `src/payload.config.ts` | Collections, DB adapter, storage plugin, editor, admin               |
| `src/collections/*.ts`  | Content models and revalidation hooks                                |
| `src/migrations/*`      | Generated SQL migrations, committed                                  |
| `src/payload-types.ts`  | Generated types, committed                                           |
| `src/cms/*`             | Typed data-access layer used by pages                                |
| `next.config.mjs`       | `withPayload(...)`, Blob `remotePatterns`, `globalNotFound`          |
| `src/env.schema.ts`     | Env validation                                                       |
| `docker-compose.yml`    | Local `postgres:18` and Vercel Blob emulator for `bun run dev-local` |

---

## Operational Notes

- **Scale-to-zero database.** Neon's free tier suspends idle compute, so the first query after a quiet period takes about a second. Cached pages are unaffected; builds and ISR misses absorb the delay. Upgrade to always-on compute if it becomes a problem.
- **Version coupling.** Payload tracks Next releases closely but not instantly. Renovate groups `next` with `payload` and `@payloadcms/*` so they bump together.
- **Backups.** Neon keeps point-in-time history per branch; Vercel Blob is the source of truth for originals. Both should be exported before any destructive migration.
- **Preview.** Payload drafts are enabled, but there is no draft preview on the site yet. A Next draft-mode route is a possible follow-up.
- **Sanity leftovers.** `scripts/migrate-from-sanity.ts` and the hidden `sanityId` fields stay until the Sanity project is decommissioned, then go in one cleanup.
