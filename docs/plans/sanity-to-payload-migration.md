---
name: sanity-to-payload-migration
overview: Replace Sanity (hosted content, GraphQL API, image CDN, embedded Studio) with Payload CMS embedded in this Next.js app, backed by Postgres and blob storage, with an in-process revalidation path and a one-shot content migration script.
todos:
  - id: choose-and-provision
    content: Confirm Payload as the target, verify its current Next 16 support, provision Neon Postgres through the Vercel Marketplace (production + development branches) and Vercel Blob, add env vars locally and in Vercel.
    status: pending
  - id: scaffold-payload
    content: Install Payload + Postgres + Vercel Blob adapters, add payload.config.ts and the (payload) route group, move the public site into a (site) route group with its own root layout.
    status: completed
  - id: define-collections
    content: Define Media, Collections, and Posts collections with slugs, Lexical rich text + code block, image sizes, versions/drafts, and afterChange/afterDelete revalidation hooks.
    status: completed
  - id: rewrite-data-layer
    content: Replace Apollo/GraphQL/codegen with a thin src/cms module built on Payload's Local API and generated payload-types.ts; rewrite pages, NavBar, NextImage, and blog rendering.
    status: completed
  - id: migrate-content
    content: Write scripts/migrate-from-sanity.ts (Sanity export → Payload Local API, assets → blob, Portable Text → Lexical) and run it against the development DB, then production.
    status: in_progress
  - id: remove-sanity
    content: Delete Sanity files, deps, scripts, env vars, knip ignores, and the sanity-graphql skill; update CI, docs, README, and e2e tests.
    status: completed
  - id: cutover
    content: Content freeze, final migration run, verify parity, merge, watch ISR, decommission Sanity after a 30-day hold.
    status: pending
isProject: false
---

### Status

Phases 1 through 3 and 5 are implemented as a stack of small PRs on top of this plan. The Phase 4 script is written and verified against production content in local Postgres and the Vercel Blob emulator. What remains needs account access.

#### Environments

Each Vercel environment pairs one database with its own Blob store, so files never cross between them:

| Vercel environment | Neon branch                                                  | Vercel Blob store                               |
| ------------------ | ------------------------------------------------------------ | ----------------------------------------------- |
| Production         | `production`                                                 | production store (connected to Production only) |
| Preview            | one branch per preview deployment, forked from `development` | preview store (connected to Preview only)       |

Previews get their own database branch, so their migrations never touch another PR's schema, and they read content copied from `development`, whose files live in the preview store. All previews share the preview store; production files are never reachable from a preview.

#### Cutover runbook

1. **Blob stores.** In Vercel, create two Blob stores. Connect one to Production only and the other to Preview only, so each environment gets its own `BLOB_READ_WRITE_TOKEN`.
2. **Neon.** Install the Neon integration on the Vercel project. Point Production at the `production` branch, and enable a branch per preview deployment with `development` as the parent.
3. **Secrets.** Add `PAYLOAD_SECRET` (a different value per environment) and `REVALIDATE_SECRET` in Vercel. Keep Vercel Deployment Protection on for Preview.
4. **Load content, preview pair first.** From a shell that has only these variables (never your local `.env`; the script refuses emulator settings pointed at a remote database):

   ```bash
   export DATABASE_URL='<Neon development branch URL>'
   export BLOB_READ_WRITE_TOKEN='<preview store token>'
   export PAYLOAD_SECRET='<any value; only used to boot Payload>'
   bun run migrate
   SANITY_DATASET=development bun run migrate:sanity
   ADMIN_EMAIL='<you>' ADMIN_PASSWORD='<password>' bun run create-admin
   ```

5. **Load content, production pair.** Repeat step 4 with the Neon `production` branch URL, the production store token, and `SANITY_DATASET=production`. Create the admin here too: deployed sites reject public first-user signup, so the admin must exist before the first deploy.
6. **Release.** Merge the stack and publish a release; production deploys from the release tag (see `RELEASING.md`). Then follow Phase 6.
7. **After the 30-day hold.** Delete the Sanity project, `scripts/migrate-from-sanity.ts`, `scripts/lib/`, and the `sanityId` fields (with a migration).

Deviations from the plan below: the migration reads Sanity's public HTTP API instead of an export tarball; collection and photo edits revalidate the whole site layout because the nav lists collections on every page; Next dev runs on Node because Bun cannot resolve Turbopack's externals for Payload's database adapter; each environment has its own Blob store; and on Vercel, admins are created with `bun run create-admin` instead of the public first-user form.

### Recommendation

Migrate to **Payload CMS** (MIT), embedded in this Next.js app, using **Neon Postgres (via the Vercel Marketplace)** and **Vercel Blob** for photos. Reasons, in order of weight:

1. **Same repo, same deploy.** Payload mounts inside the Next App Router (`/admin` replaces `/studio`), so there is no second service to host, and Vercel stays the only deploy target. The other serious open source options (Strapi, Directus) are separate servers that need their own host.
2. **No network hop for content.** Server components call Payload's Local API directly. That removes Apollo, GraphQL codegen, the hosted schema deploy step, and the four Sanity GraphQL quirks documented in the README (no sub-query limits, slug lookup via `allCollections`, `Shot` forced to be a document, hard `_type` renames).
3. **Revalidation becomes in-process.** A collection `afterChange` hook calls `revalidatePath` in the same process. No webhooks, no ngrok, no signature parsing.
4. **Images.** Payload generates responsive sizes with sharp at upload time and stores them in blob storage. `next/image` keeps doing on-demand optimization on top. This is the one area where Sanity's CDN was doing real work, so it is also the main place to verify quality before cutover.
5. **Typed end to end.** `payload generate:types` replaces `graphql-codegen` and does not need a running database.

Alternatives considered and rejected:

| Option                                  | Why not                                                                                                                      |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Keystatic / TinaCMS / Decap (git-based) | Photos committed to git bloats the repo and loses image transforms. Tina's auth is a hosted service.                         |
| Strapi                                  | Separate Node server + DB to host and keep patched. Rich text is Markdown or its own blocks format.                          |
| Directus                                | Separate server. License is BSL, not OSI open source, since 2023.                                                            |
| Payload with SQLite                     | Vercel's filesystem is ephemeral. Fine for local dev, not for prod. Stick with one adapter everywhere to avoid schema drift. |

**Check before starting:** confirm the current Payload 3.x release supports Next 16 and React 19.2 (the app is on `next@^16.1.6`). If it lags, pin Next to the version Payload's `create-payload-app` template uses for the duration of the migration.

---

### Current Sanity footprint (what has to move)

| Concern        | Today                                                                                                                       | After                                                                                                                                                                                          |
| -------------- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Content models | `src/sanity/schemas/{collections,shot,blogPost,codeBlock}.ts`                                                               | `src/collections/{Media,Collections,Posts}.ts`                                                                                                                                                 |
| Admin UI       | `src/app/studio/[[...index]]/page.tsx`, `sanity.config.ts`, `sanity.cli.ts`                                                 | `src/app/(payload)/admin/[[...segments]]/` (scaffolded)                                                                                                                                        |
| Reads          | Apollo client (`apollo-client.ts`), `src/queries/*`, inline `gql` in `NavBar` and `collections/[id]`, generated `src/gql/*` | `src/cms/*` wrapping `getPayload().find()`; types from `payload-types.ts`                                                                                                                      |
| Rich text      | Portable Text + `@portabletext/react` + custom `codeBlock` type                                                             | Lexical + `@payloadcms/richtext-lexical/react` with a `Code` block                                                                                                                             |
| Images         | `cdn.sanity.io` + `@sanity/image-url` in `src/sanity/lib/image.ts` and `NextImage.tsx`                                      | Blob URLs + Payload `imageSizes`; `NextImage` takes a `Media` doc                                                                                                                              |
| Revalidation   | Sanity webhook → `/api/revalidate` (`next-sanity/webhook`), manual `/api/revalidateRoute`, `scripts/revalidate.ts`          | `afterChange`/`afterDelete` hooks → `revalidatePath`. Keep `/api/revalidateRoute` as a manual escape hatch.                                                                                    |
| Preview        | `src/sanity/preview.ts`, `IFramePreviewView.tsx`, `/api/preview`, `/api/exit-preview`                                       | Already broken today (`/api/draft` and `/api/sanity/preview` do not exist, and the view is never registered). Replace with Payload drafts + a `/next/preview` route in a later phase, or drop. |
| Env            | `NEXT_PUBLIC_SANITY_*`, `SANITY_API_TOKEN`, `SANITY_WEBHOOK_SECRET`                                                         | `DATABASE_URL`, `PAYLOAD_SECRET`, `BLOB_READ_WRITE_TOKEN`, `NEXT_PUBLIC_SERVER_URL`, `REVALIDATE_SECRET`                                                                                       |
| Build          | `bun run generate` (codegen against hosted schema) then `next build`                                                        | `payload generate:types`, `payload migrate`, then `next build`                                                                                                                                 |
| Tooling        | `skills/sanity-graphql/SKILL.md`, `scripts/migrateDocumentType.js`, `e2e/studio.spec.ts`, knip ignores                      | Payload skill, migration script deleted after cutover, `e2e/admin.spec.ts`, knip entries updated                                                                                               |

Dependencies that go away: `sanity`, `next-sanity`, `@sanity/client`, `@sanity/code-input`, `@sanity/image-url`, `@sanity/preview-url-secret`, `@sanity/vision`, `@portabletext/react`, `@apollo/client`, `graphql`, `@graphql-codegen/*`, `suspend-react`, `styled-components` (only used by the dead preview view), plus the `get-it`, `@sanity/client`, and `@codemirror/*` entries in `resolutions`.

Dependencies that arrive: `payload`, `@payloadcms/next`, `@payloadcms/db-postgres`, `@payloadcms/richtext-lexical`, `@payloadcms/storage-vercel-blob`, `sharp`, `graphql` (Payload peer dep, stays but unused by app code).

---

### Phase 0: Decide and provision (half a day)

- Confirm Payload + Next 16 compatibility (see note above).
- Install the Neon integration from the Vercel Marketplace on this project. It creates a Neon project and injects `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` into Vercel env for every environment; Payload reads `DATABASE_URL` through the standard `pg` driver, so no Neon-specific client is needed. Create two Neon branches, `production` and `development`, mirroring the current two Sanity datasets, and point the Vercel Production environment at the first and Preview/Development at the second. Neon's free tier covers this site's size.
- Create a Vercel Blob store. Record the read-write token.
- Add env vars to `.env` and Vercel (preview + production). CI builds currently hit Sanity's development dataset; they will use a `postgres:18` service container instead, so no database secret is needed in GitHub.
- Export the Sanity datasets now so the migration script can be developed offline:

```bash
bunx sanity dataset export production ./scratch/sanity-production.tar.gz
```

### Phase 1: Scaffold Payload beside the existing site (1 day)

Keep Sanity running. Nothing user-visible changes in this phase.

- Install the packages above. Add `payload.config.ts` at the repo root with `postgresAdapter` from `@payloadcms/db-postgres` (plain node-postgres `pg`, `pool.connectionString: process.env.DATABASE_URL`), Vercel Blob storage plugin, Lexical editor, and `typescript.outputFile: 'src/payload-types.ts'`.
- Restructure `src/app` into two route groups, each with its own root layout. Payload's admin needs its own `<html>` and must not inherit MUI, Tailwind globals, or the Google Analytics script:
  - `src/app/(site)/` gets the current `layout.tsx`, `Providers.tsx`, `page.tsx`, `about/`, `blog/`, `collections/`, `not-found.tsx`, `robots.txt/`, `sitemap.xml/`, `llms.txt/`, and `api/revalidateRoute/`.
  - `src/app/(payload)/` gets the scaffolded `admin/[[...segments]]/page.tsx`, `layout.tsx`, `api/[...slug]/route.ts`, `api/graphql/route.ts`, and `custom.scss`.
- Add scripts: `"generate": "payload generate:types"`, `"payload": "payload"`, `"migrate": "payload migrate"`, `"migrate:create": "payload migrate:create"`. Change `build` to `bun run generate && bun run migrate && bun run --bun next build`. Drop `dev:generate`, `graphql-deploy*`, and `ngrok-start`.
- Local development runs Postgres in Docker, pinned to `postgres:18` because Neon supports Postgres 14 through 18 and 18 is the newest. `docker-compose.yml` defines the `db` service with a health check and a named volume; `bun run dev-local` starts it with `docker compose up -d --wait` and then runs `bun run dev`. `DATABASE_URL` in `.env` points at `postgres://postgres:postgres@localhost:54320/to_the_moon`. Uploads fall back to local disk when `BLOB_READ_WRITE_TOKEN` is unset, so Blob is not required locally.
- Add `withPayload(nextConfig)` in `next.config.js`. Remove `cdn.sanity.io` from `remotePatterns` later; add the blob hostname now.
- Update `src/env.schema.ts` and `.env.example` with the new variables. Keep the Sanity ones until Phase 5.

### Phase 2: Define collections (1 day)

`src/collections/Media.ts`

- Upload collection. Fields: `alt` (text, required). `imageSizes`: `thumbnail` 400w, `card` 800w, `large` 1600w, `xl` 2400w, all `fit: inside` so aspect ratio is preserved. Store width/height (Payload does this by default) so `next/image` gets intrinsic dimensions.
- Access: public read, admin-only write.

`src/collections/Collections.ts` (slug `collections`, admin title `Collections`)

- `title` (text, required), `slug` (text, unique, indexed, auto-filled from title via a `beforeValidate` hook), `description` (text), `date` (date), `location` (text), `photos` (array of `{ title: text, photo: upload → media, required }`).
- `Shot` stops being a top-level type. The array row is the shot.
- `versions: { drafts: true }` so publishing is explicit.
- Hooks: `afterChange` and `afterDelete` call `revalidatePath('/')`, `revalidatePath('/collections/[slug]')` for the old and new slug, and `revalidatePath('/blog')` is not needed here. Guard with `if (!context.skipRevalidate)` so the migration script can bulk-load without revalidating.
- `defaultSort: '-createdAt'` to match today's homepage ordering on `_createdAt`.

`src/collections/Posts.ts` (slug `posts`, admin title `Blog Posts`)

- `title`, `slug`, `publishedAt` (date, required), `body` (richText, required).
- Lexical features: headings h2/h3, bold, italic, inline code, link, plus `BlocksFeature` with one block `Code` having fields `language` (select: typescript, javascript, html, css) and `code` (code field). This reproduces today's `codeBlock` type one for one.
- Drafts on. Hooks revalidate `/blog` and `/blog/[slug]`.

`payload.config.ts`

- `collections: [Media, Collections, Posts]`, `admin.user: 'users'` with a `Users` auth collection (one admin account).
- Run `bun run generate` and commit `src/payload-types.ts`. Run `bun run migrate:create` and commit the first migration under `src/migrations/`.

### Phase 3: Rewrite the data layer and pages (1.5 days)

Create `src/cms/` as the only module that touches Payload:

- `client.ts`: `export const getCms = cache(() => getPayload({ config }))`.
- `collections.ts`: `listCollections({ limit, depth: 1 })`, `getCollectionBySlug(slug)`, `listCollectionSlugs()`.
- `posts.ts`: `listPosts()`, `getPostBySlug(slug)`, `listPostSlugs()`.
- All return `payload-types.ts` types. No `any`.

Page changes:

- `(site)/page.tsx`: call `listCollections`, map `photos[0].photo` to `ImageGrid`. The homepage query can now ask for `depth: 1` and only read the first photo, fixing the README's "fetches all photos" complaint for the cover grid once a `coverPhoto` field or `select` projection is added (Payload supports `select` for field-level projection; use it to pull only `photos.0.photo` if cover performance matters).
- `(site)/collections/[id]/page.tsx`: `getCollectionBySlug`, `listCollectionSlugs` for `generateStaticParams`. Keep `revalidate = 600` as a safety net.
- `(site)/blog/page.tsx` and `blog/[slug]/page.tsx`: use `src/cms/posts.ts`. Replace `PortableText` with `RichText` from `@payloadcms/richtext-lexical/react`, passing `converters` that map `heading`, `paragraph`, `link`, inline `code`, and the `Code` block to the existing MUI `Typography` and `SyntaxHighlighter` markup. The visual output should be identical.
- `NavBar.tsx`: delete the Apollo `useLazyQuery`. Fetch the nav list in `Layout.tsx` (a server component) and pass `collections` as a prop. Remove `ApolloProvider` from `Providers.tsx` and delete `src/utils/constants.ts`.
- `NextImage.tsx`: accept `Media` (or a size key). Pick `sizes.large.url` by default, fall back to `url`. Pass `width`/`height` from the doc when not using `fill`.
- `ImageGrid.tsx`: type `photo` as `Media`. Drop the `sanity` type import.
- `sitemap.xml/route.ts`: optionally list collection and post slugs now that the data is one function call away.

Delete `apollo-client.ts`, `codegen.ts`, `src/queries/`, `src/gql/`, `src/utils/constants.ts`.

### Phase 4: Content migration script (1 day, plus verification)

`scripts/migrate-from-sanity.ts`, run with `bun run tsx`. Idempotent: keys every created doc by the original Sanity `_id` stored in a hidden `sanityId` field on each collection, so re-runs update instead of duplicate.

1. Read the Sanity export tarball (`data.ndjson` + `images/`). Do not hit the Sanity API during the run, so the script works after the project is deleted.
2. **Assets.** For each `sanity.imageAsset`, upload the original file to Media via `payload.create({ collection: 'media', filePath, data: { alt, sanityId }, context: { skipRevalidate: true } })`. Payload generates the sizes. Build a `_ref → media.id` map.
3. **Collections.** For each `collections` doc, map fields directly. `photos[]` rows resolve `photo.asset._ref` through the map and carry `title`. Set `_status: 'published'`, preserve `createdAt` from `_createdAt` (Payload allows overriding timestamps on create through the Local API).
4. **Posts.** Convert Portable Text to Lexical JSON with a small purpose-built mapper rather than a generic HTML round trip, because the mark set is tiny: `normal/h2/h3` styles, `strong/em/code` marks, `link` markDefs, and the `codeBlock` custom type. Each `block` becomes a `paragraph` or `heading` node, marks become Lexical `format` bitmask flags, links become `link` nodes, and `codeBlock` becomes a `block` node with `blockType: 'code'`.
5. **Verification.** After the run, print counts (assets, collections, posts, photos per collection) against the ndjson, and dump each post body as plain text from both representations and diff them. Spot check in `/admin`.

Run order: development dataset → Neon `development` branch, iterate until the diff is clean, then production dataset → Neon `production` branch during the cutover freeze.

### Phase 5: Remove Sanity and update tooling (half a day)

- Delete `src/sanity/`, `sanity.config.ts`, `sanity.cli.ts`, `src/app/studio/`, `src/app/api/preview/`, `src/app/api/exit-preview/`, `src/app/api/revalidate/`, `scripts/migrateDocumentType.js`, `skills/sanity-graphql/`. Keep `scripts/revalidate.ts`, which now authenticates with `REVALIDATE_SECRET`.
- Remove the dependencies and `resolutions` listed above. Remove `transpilePackages` for Sanity packages and `styled-components` from `next.config.js`.
- `src/app/api/revalidateRoute/route.ts`: read `REVALIDATE_SECRET` instead of `SANITY_WEBHOOK_SECRET`. Update `e2e/api.spec.ts` to match and drop the webhook-signature test.
- `e2e/studio.spec.ts` → `e2e/admin.spec.ts`: assert `/admin` renders the Payload login form.
- `knip.jsonc`: remove the Sanity ignores and `ignoreDependencies`; add `payload.config.ts`, `src/collections/**`, `src/migrations/**` as entries.
- `.github/workflows/ci.yml`: add a `postgres:18` service container to the build and e2e jobs, and swap the `env` block for `DATABASE_URL` (pointing at that container), a throwaway `PAYLOAD_SECRET`, and `NEXT_PUBLIC_SERVER_URL`. Leave `BLOB_READ_WRITE_TOKEN` unset so uploads use local disk. Seed fixture content before Playwright runs. The e2e job's "Generate GraphQL types" step becomes `bun run generate`.
- `vercel.json`: the `X-Frame-Options: DENY` header applies to `/admin` too. Fine unless Live Preview is added later (it uses an iframe); scope it to `/(?!admin).*` if so.
- Docs: rewrite `docs/data-flow.md`, `docs/architecture.md` (stack table, diagram, env table), `docs/development.md` (setup, no ngrok), `README.md` (remove the "Weird things" Sanity section and the schema deploy steps). Add `skills/payload-cms/SKILL.md` with the collection-change workflow: edit collection → `bun run generate` → `bun run migrate:create` → commit migration.

### Phase 6: Cutover

1. Announce a content freeze (one person, so: stop editing in Studio).
2. Run the migration against the Neon `production` branch. Run the verification diff.
3. Merge the stack and publish a release. The release-tag deploy runs `payload migrate` then `next build`. Confirm `/`, `/collections/[slug]`, `/blog`, `/blog/[slug]`, `/admin` on both domains.
4. Edit one collection in `/admin`, confirm the page updates within seconds without a webhook.
5. Keep the Sanity project and the export tarball untouched for 30 days, then delete the project and cancel billing. Delete `scripts/migrate-from-sanity.ts` and the `sanityId` fields in a follow-up.

---

### Risks and mitigations

- **Image quality and URLs change.** Every photo URL changes, so externally cached or hot-linked images break. Compare a few collections side by side at 1x and 2x before cutover. Keep originals in Blob so sizes can be regenerated.
- **Build-time database dependency.** `generateStaticParams` and page renders now hit Neon during `next build`. Sanity's CDN was effectively always up. Neon's free tier scales to zero and has cold starts of about a second. ISR with `revalidate = 600` plus on-demand hooks means a slow DB only affects builds and cache misses, never already-cached pages. Move to an always-on Neon compute if builds flake.
- **Portable Text → Lexical fidelity.** The mark set is small and the diff step in Phase 4 catches text loss. Formatting-only differences are reviewed by eye on the handful of existing posts.
- **Payload and Next version coupling.** Payload tracks Next closely but not instantly. Renovate will propose Next bumps that Payload does not yet support. Add a Renovate `packageRules` entry grouping `next` with `payload` and `@payloadcms/*`.
- **Admin bundle in the same Next app.** Dev server startup gets heavier. Production routes are code split per route group, so the public site bundle is unaffected.
- **One more set of secrets.** `PAYLOAD_SECRET` and `DATABASE_URL` are more sensitive than Sanity's public project id. They live only in Vercel env, never in `NEXT_PUBLIC_*`.

### Effort

Roughly five to six working days end to end, with Phase 4 the least predictable. Phases 1 through 3 can land as one PR behind the new route group with Sanity still live, so the site never depends on a half-finished migration.
