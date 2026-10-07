# Development Guide

## Prerequisites

- Node 24 (`.node-version`) and Bun 1.4.2 (`package.json` `packageManager`)
- Docker, for the local Postgres container

---

## Setup

```bash
bun install --frozen-lockfile
cp .env.example .env        # values work as-is with dev-local
bun run dev-local
```

`dev-local` starts `postgres:18` and a Vercel Blob emulator from `docker-compose.yml`, applies migrations, seeds an empty database with sample collections and a post, and starts Next on [localhost:3333](http://localhost:3333). Create the first admin user at [localhost:3333/admin](http://localhost:3333/admin).

Nothing talks to a hosted service: Postgres stands in for Neon, and [Payload's Vercel Blob emulator](https://github.com/payloadcms/vercel-blob-emulator) stands in for Vercel Blob, including the browser's direct uploads from the admin. Host ports default to 54320 (Postgres) and 3100 (Blob) so they do not collide with other containers; override them with `POSTGRES_PORT` and `BLOB_EMULATOR_PORT` and update the URLs in `.env` to match.

| Command                                            | Effect                                                                                     |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `bun run dev-local:down`                           | Stop the containers, keeping data                                                          |
| `bun run dev-local:reset`                          | Delete the database and blob volumes; the next `dev-local` migrates and seeds from scratch |
| `bun run seed`                                     | Add sample content to an empty database                                                    |
| `SANITY_DATASET=production bun run migrate:sanity` | Load the real site content into the local database and emulator                            |

---

## Changing Content Models

1. Edit a collection in `src/collections/`.
2. `bun run payload:types` regenerates `src/payload-types.ts`.
3. `bun run migrate:create -- <short_name>` writes a migration to `src/migrations/`.
4. `bun run migrate` applies it locally.
5. Commit the collection, generated types, and migration together.

The [payload-cms skill](../skills/payload-cms/SKILL.md) covers data access, media, and revalidation conventions.

---

## Testing On-Demand Revalidation

Revalidation runs inside the app, so no tunnel or webhook is needed:

```bash
bun run build && bun run start
```

Then edit and publish a collection or post at `localhost:3000/admin` and reload the page. The server log prints `Revalidated <path>` for each path.

---

## Git Hooks

`pre-commit` runs lint-staged and `pre-push` runs lint, type-check, and tests. Both source [`scripts/hook-env.sh`](../scripts/hook-env.sh), which activates the node version from `.node-version` (via nvm), uses the bun version from `package.json` (via npx when the global bun differs), runs a frozen install, and loads `.env` from the main checkout when the current checkout has none. This makes the hooks work from git worktrees without manual setup.

---

## Code Quality

| Command              | What it does                                            |
| -------------------- | ------------------------------------------------------- |
| `bun run check`      | Lint, type-check, unit tests, and knip. Run before a PR |
| `bun run lint`       | ESLint                                                  |
| `bun run lint:fix`   | Prettier, then ESLint with fixes                        |
| `bun run type-check` | `tsc --noEmit` with the TypeScript 7 compiler           |
| `bun run test`       | Vitest unit tests                                       |
| `bun run test:e2e`   | Playwright against a dev server                         |

---

## Build & Deploy

```bash
bun run build    # applies migrations when DATABASE_URL is set, then next build
bun run start    # serves the production build
```

Deploys go out from release tags; see [RELEASING.md](../RELEASING.md). Vercel needs `DATABASE_URL` (from the Neon integration), `PAYLOAD_SECRET`, and `BLOB_READ_WRITE_TOKEN`.

---

## Bundle Analysis

```bash
bun run analyze
```

---

## Known Quirks

1. **Next dev runs on Node, not Bun.** Bun cannot resolve the hashed external module names Turbopack uses for Payload's database adapter. Production `build` and `start` still use Bun.
2. **Two root layouts.** `(site)` and `(payload)` each have their own `<html>`. Unmatched URLs render `src/app/global-not-found.tsx`, which reuses the site shell.
3. **Slugs on Local API writes.** Payload's slug field generates slugs in the admin UI. Scripts that create published documents must pass `slug` explicitly.
4. **AnimatedSpan timing.** If you change the animation duration in `src/styles/animate.css`, update `transitionTotal` in `AnimatedSpan.tsx` to half of it, since the animation alternates.
