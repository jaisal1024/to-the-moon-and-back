# Architecture Overview

## Project Overview

**To the Moon and Back** is Jaisal Friedman's personal photography + portfolio website. It is a headless CMS-powered static site built with Next.js and Sanity.io, deployed on Vercel.

- Live sites: [jaisal.xyz](https://www.jaisal.xyz/) | [jaisalfriedman.com](https://www.jaisalfriedman.com/)

---

## Technology Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Framework | **Next.js** | ^13.1.1 | SSG + ISR rendering, routing, API routes |
| Language | **TypeScript** | ^5.0.4 | Type safety across the full app |
| CMS | **Sanity.io** | ^3.1.4 | Content management for photography collections |
| Data Fetching | **Apollo Client** | ^3.7.12 | GraphQL client for querying Sanity's GraphQL API |
| Type Generation | **graphql-codegen** | ^3.3.0 | Generates TypeScript types from GraphQL schema |
| UI Library | **MUI (Material UI)** | ^5.12.1 | Component library for layout, typography, buttons |
| Styling | **Tailwind CSS** | ^3.3.1 | Utility-first CSS for layout and spacing |
| Styling (CSS-in-JS) | **Emotion** | ^11.10.6 | Underlying styled engine for MUI |
| Deployment | **Vercel** | — | Auto-deploys on merge to `main` |
| Analytics | **Google Analytics** | — | Via `gtag.js` in `_app.tsx` |

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
         │  (SSG via getStaticProps)     │
         │                               │
         │  Pages:                       │
         │  / (index) → ImageGrid        │
         │  /collections/[slug]          │
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

- Pages are pre-rendered at **build time** using `getStaticProps` and `getStaticPaths`
- ISR is configured with a **10-minute revalidation window** (`revalidate: 600`)
- Sanity webhooks trigger on-demand revalidation via `/api/revalidate` when content changes in the CMS

### ISR / Revalidation Flow

```
Sanity CMS edit → Sanity Webhook → /api/revalidate endpoint → Next.js revalidates page
```

For local development, ngrok is used to expose `localhost` to the internet so Sanity webhooks can reach the dev server.

---

## Styling Architecture

The site uses a **dual-styling approach**:

1. **MUI ThemeProvider** (`src/theme.ts`) — defines the global typography scale, color palette, and font families
   - **Fonts**: `futura-pt` (headings), `proxima-nova` (body) via Adobe Fonts (loaded via `_document.tsx`)
   - **Palette**: Minimalist — white primary, carbon secondary, dangerRed for errors
2. **Tailwind CSS** — used for layout, spacing, responsive modifiers (e.g., `sm:flex-row`, `hidden sm:block`)

> These two systems coexist: MUI handles components and typography, Tailwind handles layout and spacing utilities.

---

## Environment Variables

See `.env.example` for required variables. Key variables:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | Sanity project ID |
| `NEXT_PUBLIC_SANITY_DATASET` | Sanity dataset (e.g., `production`) |
| `SANITY_API_TOKEN` | Server-side Sanity read token |
| `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID` | Google Analytics measurement ID |
| `REVALIDATE_SECRET` | Webhook secret for ISR revalidation |

---

## Key Configuration Files

| File | Purpose |
|---|---|
| `next.config.js` | Next.js config (bundle analyzer, image domains) |
| `tailwind.config.js` | Tailwind CSS configuration |
| `codegen.ts` | GraphQL codegen config — generates types to `src/gql/` |
| `sanity.config.ts` | Sanity studio configuration |
| `apollo-client.ts` | Apollo Client singleton setup |
| `tsconfig.json` | TypeScript config with path aliases (`src/` → `@`) |
| `.eslintrc.json` | ESLint rules (typescript, import sort, unused imports) |
| `.prettierrc.json` | Prettier formatting config |
| `renovate.json` | Automated dependency updates config |
