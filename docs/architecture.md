# Architecture Overview

## Project Overview

**To the Moon and Back** is Jaisal Friedman's personal photography + portfolio website. It is a headless CMS-powered static site built with Next.js and Sanity.io, deployed on Vercel.

- Live sites: [jaisal.xyz](https://www.jaisal.xyz/) | [jaisalfriedman.com](https://www.jaisalfriedman.com/)

---

## Technology Stack

| Layer           | Technology            | Version | Purpose                                                  |
| --------------- | --------------------- | ------- | -------------------------------------------------------- |
| Framework       | **Next.js**           | ^16.1.6 | App Router, SSG + ISR rendering, API routes              |
| Language        | **TypeScript**        | ^5.9.3  | Type safety across the full app                          |
| CMS             | **Sanity.io**         | ^5.16.0 | Content management for photography collections           |
| Data Fetching   | **Apollo Client**     | ^4.1.6  | GraphQL client for querying Sanity's GraphQL API         |
| Type Generation | **graphql-codegen**   | ^5.0.3  | Generates TypeScript types from GraphQL schema           |
| UI Library      | **MUI (Material UI)** | ^7.3.9  | Component library for layout, typography, buttons        |
| Styling         | **Tailwind CSS**      | ^3.4.17 | Utility-first CSS for layout, spacing, and small accents |
| Deployment      | **Vercel**            | —       | Auto-deploys on push to `main`                           |
| Infrastructure  | **IaC**               | —       | Project defined via `vercel.json`                        |
| Analytics       | **Google Analytics**  | —       | Via inline `gtag.js` script in the root layout           |

---

## High-Level Architecture

```
                  ┌──────────────┐
                  │  Sanity CMS  │  (Content Management)
                  │  (sanity.io) │
                  └──────┬───────┘
                         │ GraphQL API
                         ▼
                  ┌──────────────┐
                  │ Apollo Client │  (apollo-client.ts)
                  └──────┬───────┘
                         │
                         ▼
         ┌───────────────────────────────┐
         │         Next.js App           │
         │  (App Router + SSG / ISR)     │
         │                               │
         │  Routes (App Router):         │
│  /  (collections)             │
│  /collections/[id]            │
│  /blog, /blog/[slug]          │
│  /about                       │
│  /studio (Sanity embedded)    │
         └───────────────┬───────────────┘
                         │ ISR Webhook
                         ▼
                  ┌──────────────┐
                  │    Vercel    │  (auto-deploy, serves static pages)
                  └──────────────┘
```

---

## Rendering Strategy

The site uses **Next.js Static Site Generation (SSG)** with **Incremental Static Regeneration (ISR)**:

- Pages are pre-rendered at **build time** (SSG)
- ISR is configured with a **10-minute revalidation window** (`revalidate: 600`) via `revalidate` segment exports
- Sanity webhooks trigger on-demand revalidation via `/api/revalidate`
- SEO is managed via the **Next.js Metadata API** (replacing the legacy `PageTitle` component)

### ISR / Revalidation Flow

```
Sanity CMS edit → Sanity Webhook → /api/revalidate endpoint → Next.js revalidates page
```

For local development, ngrok is used to expose `localhost` to the internet so Sanity webhooks can reach the dev server.

---

## Styling Architecture

Public pages are styled with **CSS modules** on top of one shared design system in `src/components/site/site.module.css`: colour tokens, a fluid type scale, black photo mats and black "night" sections, set in **Geist** (loaded via `next/font` in `SitePage`). Light and dark themes swap the tokens under `[data-theme='dark']`; `Providers` sets that attribute from the system preference or a `?theme=` override. See [components.md](./components.md).

The root layout still loads Tailwind, MUI's `ThemeProvider` and the `Archivo Black` / `DM Sans` fonts; after the redesign they are only used by `Providers` and the embedded Sanity Studio.

---

### Safety Guardrails (Environment Validation)

The project uses **Zod** for strict environment variable validation.

- **Source**: `src/env.schema.ts`
- **Behavior**: The application will throw an error and fail to build or start if any required environment variables are missing or incorrectly formatted. This ensures operational safety for both humans and agents.

| Variable                                | Purpose                                  |
| --------------------------------------- | ---------------------------------------- |
| `NEXT_PUBLIC_SANITY_PROJECT_ID`         | Sanity project ID                        |
| `NEXT_PUBLIC_SANITY_DATASET`            | Sanity dataset (e.g., `production`)      |
| `NEXT_PUBLIC_SANITY_API_VERSION`        | Sanity API version (e.g. `2022-11-28`)   |
| `NEXT_PUBLIC_SANITY_GRAPHQL_SCHEMA_URL` | Sanity GraphQL endpoint                  |
| `SANITY_API_TOKEN`                      | Server-side Sanity read token (optional) |
| `REVALIDATE_SECRET`                     | Webhook secret for ISR revalidation      |
| `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID`       | GA measurement ID (optional)             |

---

## Key Configuration Files

| File                 | Purpose                                                |
| -------------------- | ------------------------------------------------------ |
| `next.config.js`     | Next.js config (bundle analyzer, image domains)        |
| `vercel.json`        | Infrastructure as Code (routing, security headers)     |
| `src/env.schema.ts`  | Strict environment variable validation                 |
| `tailwind.config.js` | Tailwind CSS configuration + semantic color extensions |
| `codegen.ts`         | GraphQL codegen config — generates types to `src/gql/` |
| `sanity.config.ts`   | Sanity studio configuration                            |
| `apollo-client.ts`   | Apollo Client singleton setup                          |
| `tsconfig.json`      | TypeScript config with path aliases (`src/` → `@`)     |
| `.eslintrc.json`     | ESLint rules (TypeScript, import sort, unused imports) |
| `.prettierrc.json`   | Prettier formatting config                             |
| `renovate.json`      | Automated dependency updates config                    |
| `backlog/`           | Structured agent task queue                            |
