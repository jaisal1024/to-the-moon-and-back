# Product features

Personal photography and portfolio site: Next.js App Router pages backed by
Sanity content (collections of photos and blog posts) fetched over GraphQL.
Every public page is anonymous; the only signed-in surface is Sanity Studio.

## Site-wide

### Navigation

`src/components/NavBar.tsx`

- The "Jaisal Friedman" title links home. It renders as an `h1` on `/` and `h2` elsewhere.
- **Desktop (≥ Tailwind `sm`)**: Collections, Blog, and About in the top bar.
  - Collections opens a popover that lazily queries up to 20 collections
    (newest first). It shows a spinner while loading, "Failed to fetch collections" on
    error, then a list starting with Home. The current route is underlined.
  - Collections is underlined on `/` and any `/collections/*` page. Blog and About
    are underlined on their own routes.
- **Mobile (< `sm`)**: The desktop links are hidden. A hamburger opens a full-screen dialog
  with Collections (same lazy list and states), Blog, and About sections, plus a
  close button.

### Footer

`src/components/Footer.tsx`

- "© Jaisal Friedman <current year>".
- Connect: LinkedIn, GitHub, `mailto:hi@jaisal.xyz` (icon links).
- Site Map: Photography (`/`), Blog, About.

### Theme

`src/app/Providers.tsx`, `src/theme.ts`, `src/styles/globals.css`

- Light/dark mode follows `prefers-color-scheme` and updates live when the OS
  setting changes.
- A `?theme=dark` or `?theme=light` query param overrides the OS preference.
- Mode is applied as `data-theme` on `<html>` and drives both MUI palettes and
  Tailwind semantic color tokens.
- Fonts: Archivo Black for the hero heading, DM Sans for everything else.

### Analytics and headers

- The Google Analytics `gtag.js` tag loads when `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID`
  is set (`src/app/layout.tsx`).
- `vercel.json` adds `X-Content-Type-Options`, `X-Frame-Options: DENY`, and
  `X-XSS-Protection` to every response. It also enables clean URLs.

## Photography

### Collections grid (home)

`/`. Sources: `src/app/page.tsx` and `src/components/ImageGrid.tsx`.

- Lists all collections, newest created first, each shown by its first photo as
  the cover. The grid is one column below `lg` and two columns at `lg` and up.
- Each cover has a title overlay button. Clicking the image or the button opens
  the collection.
- Empty state: "No collections to show."
- The page is statically generated and revalidates every 10 minutes.

### Collection detail

`/collections/[slug]` → `src/app/collections/[id]/page.tsx`

- Shows title, description, month and year of the collection date, location, and
  the full photo grid. Photos are not clickable.
- The page title is "Jaisal Friedman - <collection title>".
- Pages are pre-built for every collection slug and revalidate every 10 minutes.
- An unknown slug currently returns **500** (the page throws). A 404 is intended.
- There is no `/collections` index page. That URL returns 404, even though
  the sitemap lists it.

Content model (`src/sanity/schemas/collections.ts`, `shot.ts`): a collection has
title, slug, description, date, location, and `photos[]`. Each photo is a
`shot` with a title and an image served from `cdn.sanity.io` through `next/image`.

## Blog

### Blog index

`/blog` → `src/app/blog/page.tsx`

- A card per post shows the title (linked), the publish date ("Month D, YYYY"), or
  "Unpublished" if there is none, and a "Read post" link.
- Empty state: "No blog posts yet. Add one in Sanity Studio to populate this
  page."
- Revalidates every 10 minutes.

### Blog post

`/blog/[slug]` → `src/app/blog/[slug]/page.tsx`

- Title, publish date or "Unpublished", and Portable Text body.
  - Supports h2 and h3 headings, paragraphs, inline code, and links. Links
    starting with `http` open in a new tab.
  - `code` blocks render as plain preformatted text. `codeBlock` blocks are
    syntax-highlighted (VS Code Dark+ theme; languages are TypeScript,
    JavaScript, HTML, and CSS). Both show an optional filename caption.
- An unknown slug renders the 404 page.

## About

`/about` → `src/app/about/page.tsx`

- A portrait with a glow effect, an intro, and two rotating word lists ("I'm a …",
  "I love to …") driven by `AnimatedSpan`. Also links to Counsel Health and LinkedIn
  (new tab), plus a location line.
- Static. The image stacks above the text on mobile and sits beside it from `sm` up.

## Not found

`src/app/not-found.tsx`: centered "404 - Page Not Found" for unknown routes,
rendered without the nav and footer.

## Machine-readable routes

- `/llms.txt`: plain-text site summary for AI crawlers, linking Home, About,
  Blog, Collections, robots, and sitemap.
- `/robots.txt`: allows all crawlers and points to the sitemap.
- `/sitemap.xml`: static list of `/`, `/about`, `/blog`, `/collections` on
  `https://www.jaisal.xyz`. Individual collections and posts are not listed.

## Content management

### Sanity Studio

`/studio/*` → `src/app/studio/`, `sanity.config.ts`

- Embedded Studio that requires a Sanity login (shows "Choose login provider").
- Document types: Collections, Shots, Blog Posts, and Code Block (used inside
  posts). Plugins: structure tool, Vision (GROQ playground), and code input.

### On-demand revalidation

- `POST /api/revalidate`: Sanity webhook endpoint, verified with
  `SANITY_WEBHOOK_SECRET`.
  - An invalid signature returns 401.
  - A `collections` payload revalidates `/collections/<slug>` and `/`.
  - Other types are acknowledged and ignored.
- `POST /api/revalidateRoute`: manual revalidation using the headers `secret` and
  `route`.
  - A wrong secret returns 401. A missing route returns 400.
  - Success returns 200 with "Revalidated <route>".

### Draft preview

- `GET /api/preview?secret=…&slug=…`: checks the secret against the one stored
  in Sanity (requires the `SANITY_API_TOKEN` read token).
  - On success it enables Next draft mode and redirects to `/<slug>`.
  - Errors: 500 when no token is configured, 401 for a bad or missing secret,
    404 when the slug is missing.
- `GET /api/exit-preview`: disables draft mode and redirects to `/`.
