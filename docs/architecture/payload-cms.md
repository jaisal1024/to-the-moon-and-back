# Target Architecture: Payload CMS

This document describes the architecture of the site **after** the Sanity → Payload migration described in [docs/plans/sanity-to-payload-migration.md](../plans/sanity-to-payload-migration.md). The current (Sanity) architecture is documented in [docs/architecture.md](../architecture.md); that file is replaced by this one once the migration lands.

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
| UI             | **MUI** + **Tailwind CSS**             | Unchanged                                                                                                                          |
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

Public read, admin-only write. Files live in Vercel Blob.

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

Single admin account. Only used to log in to `/admin`.

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
  → revalidatePath('/'), revalidatePath('/collections/<slug>'), revalidatePath('/blog'), ...
  → Next regenerates the page on the next request
```

Hooks honor `context.skipRevalidate` so bulk imports do not trigger thousands of revalidations.

`/api/revalidateRoute` remains as a manual escape hatch, authenticated with `REVALIDATE_SECRET`.

---

## Images

1. Author uploads an original to `media`. Payload stores it in Vercel Blob and generates the four sizes with sharp.
2. `NextImage` receives a `Media` document, picks a size (default `large`), and passes the blob URL plus intrinsic `width`/`height` to `next/image`.
3. Vercel's image optimizer serves the final format and resolution. The blob hostname is allowed in `next.config.js` `remotePatterns`.

Originals are retained, so sizes can be regenerated if the size set changes.

---

## Build and Deploy

```bash
bun run build
  → payload generate:types   # src/payload-types.ts
  → payload migrate          # apply pending SQL migrations in src/migrations/
  → next build               # SSG; hits Neon for generateStaticParams
```

Schema changes follow: edit `src/collections/*` → `bun run generate` → `bun run migrate:create` → commit the migration. Production never uses Payload's `push` mode.

Deployment is unchanged: merge to `main` triggers a Vercel build. Payload connects with the plain `pg` driver via `@payloadcms/db-postgres`; nothing Neon-specific is in the code. The Neon Vercel integration injects `DATABASE_URL` (pooled) per Vercel environment: Production points at the Neon `production` branch, Preview at `development`. CI does not use Neon: each job runs a `postgres:18` service container and points `DATABASE_URL` at it. Locally and in Claude Code cloud sessions, `bun run dev-local` starts a `postgres:18` container from `docker-compose.yml` (the newest major Neon supports) and then the dev server.

---

## Environment Variables

Validated in `src/env.schema.ts`.

| Variable                          | Scope  | Purpose                                                                           |
| --------------------------------- | ------ | --------------------------------------------------------------------------------- |
| `DATABASE_URL`                    | server | Postgres connection string: Neon pooled URL on Vercel, local Docker URL in `.env` |
| `PAYLOAD_SECRET`                  | server | Signs admin sessions. Never exposed to the client.                                |
| `BLOB_READ_WRITE_TOKEN`           | server | Vercel Blob access for uploads                                                    |
| `NEXT_PUBLIC_SERVER_URL`          | public | Absolute origin used by Payload for admin links                                   |
| `REVALIDATE_SECRET`               | server | Auth for `/api/revalidateRoute`                                                   |
| `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID` | public | Unchanged                                                                         |

All `NEXT_PUBLIC_SANITY_*`, `SANITY_API_TOKEN`, and `SANITY_WEBHOOK_SECRET` variables are removed.

---

## Key Configuration Files

| File                   | Purpose                                                  |
| ---------------------- | -------------------------------------------------------- |
| `payload.config.ts`    | Collections, DB adapter, storage plugin, editor, admin   |
| `src/collections/*.ts` | Content models and revalidation hooks                    |
| `src/migrations/*`     | Generated SQL migrations, committed                      |
| `src/payload-types.ts` | Generated types, committed                               |
| `src/cms/*`            | Typed data-access layer used by pages                    |
| `next.config.js`       | `withPayload(...)`, blob `remotePatterns`                |
| `src/env.schema.ts`    | Env validation                                           |
| `knip.jsonc`           | Entries for `payload.config.ts`, collections, migrations |

---

## Operational Notes

- **Scale-to-zero database.** Neon's free tier suspends idle compute, so the first query after a quiet period takes about a second. Cached pages are unaffected; builds and ISR misses absorb the delay. Upgrade to always-on compute if it becomes a problem.
- **Version coupling.** Payload tracks Next releases closely but not instantly. Renovate groups `next` with `payload` and `@payloadcms/*` so they bump together.
- **Backups.** Neon keeps point-in-time history per branch; Vercel Blob is the source of truth for originals. Both should be exported before any destructive migration.
- **Preview.** Payload drafts are enabled. A Next draft-mode preview route (`/next/preview`) is a possible follow-up; it is not part of the initial migration because the Sanity preview flow was already non-functional.
