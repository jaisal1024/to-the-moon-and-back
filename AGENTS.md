# To the Moon and Back: agent guide

Personal photography portfolio and blog for Jaisal Friedman. Next.js App Router, MUI + Tailwind, deployed on Vercel. Content is managed in Payload CMS, embedded at `/admin`, with Postgres (Docker locally, Neon on Vercel) and Vercel Blob for photos. See [docs/architecture.md](docs/architecture.md) and the migration history in [docs/plans/sanity-to-payload-migration.md](docs/plans/sanity-to-payload-migration.md).

## Toolchain

| Tool | Pinned by                       | Version |
| ---- | ------------------------------- | ------- |
| Node | `.node-version`                 | 24      |
| Bun  | `package.json` `packageManager` | 1.4.2   |

- Install with `bun install --frozen-lockfile`. Never run a plain `bun install` with an older bun: it rewrites `bun.lock` to an older lockfile format and the diff is huge. If your global bun is older, `bun upgrade`, or use `npx -y bun@<version>` for one-off commands.
- Git worktrees created by the Claude desktop app get a worktree-level `core.hooksPath` pointing at the main checkout's `.husky/_`, so they would run the main checkout's hook files. `bun install` runs `prepare`, which removes that override so the worktree runs its own hooks. Until install has run, the main checkout's hooks run instead; they bootstrap from the current checkout, so the result is the same.
- The git hooks source [scripts/hook-env.sh](scripts/hook-env.sh), which activates the pinned node via nvm, falls back to the pinned bun via npx, installs dependencies, and loads env. If a hook fails, fix the environment it complains about rather than pushing with `--no-verify`.

## Commands

| Command                     | What it does                                                                                                 |
| --------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `bun run dev`               | Next dev server on http://localhost:3333                                                                     |
| `bun run dev-local`         | Starts Postgres and the Blob emulator, applies migrations, seeds an empty database, runs `bun run dev`       |
| `bun run dev-local:down`    | Stops the containers; data persists in their volumes                                                         |
| `bun run dev-local:reset`   | Deletes the local database and blob volumes                                                                  |
| `bun run payload:types`     | Regenerate `src/payload-types.ts` after changing a collection                                                |
| `bun run payload:importmap` | Regenerate the admin import map after adding custom admin components                                         |
| `bun run create-admin`      | Create or update an admin from `ADMIN_EMAIL`/`ADMIN_PASSWORD`. Deployed sites block public first-user signup |
| `bun run migrate:create`    | Generate a SQL migration in `src/migrations/` from collection changes. Commit it                             |
| `bun run migrate`           | Apply pending migrations to `DATABASE_URL`. `build` runs this when `DATABASE_URL` is set                     |
| `bun run seed`              | Add sample collections to an empty database. `dev-local` and CI run it; it skips when content exists         |
| `bun run migrate:sanity`    | Copy Sanity content into `DATABASE_URL` (`SANITY_DATASET=production`, `DRY_RUN=1` to preview)                |
| `bun run build`             | Applies migrations when `DATABASE_URL` is set, then `next build`                                             |
| `bun run check`             | `lint` + `type-check` + `test` + `knip`. Run before opening a PR                                             |
| `bun run lint` / `lint:fix` | ESLint 10 flat config (`eslint.config.cjs`); `lint:fix` also runs Prettier                                   |
| `bun run type-check`        | `tsc --noEmit`                                                                                               |
| `bun run test`              | Vitest unit tests (`*.test.tsx` under `src/`)                                                                |
| `bun run test:e2e`          | Playwright against a dev server (`e2e/`)                                                                     |
| `bun run knip`              | Unused files, exports, and dependencies                                                                      |

## Environment

- Copy `.env.example` to `.env`; its values work as-is with `dev-local`. `.env` is gitignored.
- Payload needs `DATABASE_URL` and `PAYLOAD_SECRET`, and media needs the Blob variables; `.env.example` has working values for the local containers. On Vercel only `BLOB_READ_WRITE_TOKEN` is set, and the Blob URLs default to Vercel's.
- Every env var is validated in [src/env.schema.ts](src/env.schema.ts). Adding a variable means adding it there, in `.env.example`, in `.github/workflows/ci.yml`, and in Vercel.
- `src/payload-types.ts`, `src/migrations/`, and `src/app/(payload)/` are generated by Payload; regenerate them with the `payload:*` and `migrate:create` scripts instead of editing by hand.
- Git worktrees have no `.env`. The hooks handle that for lint, type-check, and tests. To run the dev server in a worktree, symlink the main checkout's env file: `ln -s "$(git rev-parse --path-format=absolute --git-common-dir)/../.env" .env`.

## Containers

[docker-compose.yml](docker-compose.yml) runs everything the app depends on, so local development exercises the same code paths as production:

| Service | Image                                                                                                  | Host port                     | Stands in for                                         |
| ------- | ------------------------------------------------------------------------------------------------------ | ----------------------------- | ----------------------------------------------------- |
| `db`    | `postgres:18` (the newest major Neon supports)                                                         | `54320` (`POSTGRES_PORT`)     | Neon Postgres                                         |
| `blob`  | [Payload's Vercel Blob emulator](https://github.com/payloadcms/vercel-blob-emulator), pinned by digest | `3100` (`BLOB_EMULATOR_PORT`) | Vercel Blob, including browser uploads from the admin |

`.env.example` points the app at both, and its values work unchanged. If you change a host port, update `DATABASE_URL` or the three `*BLOB*_URL` variables to match.

Docker is available both on local machines and in Claude Code cloud sessions, so the setup is the same everywhere an agent runs:

1. `bun run dev-local` starts both containers, waits for their health checks, applies migrations, seeds an empty database, then starts the dev server. The Next app runs on the host, not in a container.
2. Never point a development or agent session at Neon or a real Blob store; those are only for Vercel deployments.
3. The admin UI is at http://localhost:3333/admin. Create the first user in the browser; uploads go to the emulator.
4. For the real site content instead of samples, run `SANITY_DATASET=production bun run migrate:sanity` after `dev-local`'s setup.
5. `bun run dev-local:down` stops the containers and keeps their data. `bun run dev-local:reset` deletes the database and blob volumes so the next `dev-local` starts fresh.

## Git and pull requests

- Keep one commit per branch. Address review feedback and update the branch by amending that commit and rebasing on `main`, then `git push --force-with-lease`. Only keep multiple commits when a large change genuinely needs its history to be reviewable.
- Branch from `main`. PR titles must be conventional commits (`feat:`, `fix:`, `chore:`, `docs:`, ...); CI rejects others. release-please cuts releases from merged titles, so the prefix matters.
- `pre-commit` runs lint-staged (ESLint `--fix` on staged TS). `pre-push` runs lint, type-check, and tests. Both bootstrap their own toolchain, see Toolchain above.
- CI (`.github/workflows/ci.yml`) runs build, `check`, and Playwright. Each job runs a `postgres:18` service container; the e2e job migrates and seeds it.
- Deploys happen from release tags, not from every merge. See [RELEASING.md](RELEASING.md).

## Code conventions

- Prettier formatting, `simple-import-sort` import order, no unused imports. `bun run lint:fix` handles all three.
- MUI for components and typography, Tailwind for layout and spacing. Semantic color tokens live in `src/styles/globals.css`; see [skills/ui-ux-mui-tailwind/SKILL.md](skills/ui-ux-mui-tailwind/SKILL.md).
- Content model, data access, media, and revalidation workflow is in [skills/payload-cms/SKILL.md](skills/payload-cms/SKILL.md).
- Pages are server components using ISR (`revalidate = 600`). Keep data fetching on the server.

## Where to look

- [docs/README.md](docs/README.md) indexes architecture, data flow, components, and development docs.
- [docs/plans/](docs/plans/) holds implementation plans. [backlog/](backlog/) holds queued tasks in the format of `backlog/template.md`.
- [skills/](skills/) holds reusable workflows for agents.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
