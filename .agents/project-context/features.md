# Product features

Personal photography and portfolio site: Next.js App Router pages backed by
Payload CMS content (collections of photos and blog posts), read on the server
through `src/cms/`. Every public page is anonymous; the only signed-in surface
is the Payload admin at `/admin`.

## Site-wide

### Navigation

`src/components/site/TopBar.tsx`

- A fixed bar with Collections (`/`), Blog, and About, plus the name linking
  home.
- The current section is marked with `aria-current="page"`. Collections is
  current on `/` and any `/collections/*` page.
- The bar slides away while scrolling down and returns on scroll up.
- The same bar is used at every width; there is no separate mobile menu and no
  list of collections in the nav.

### Footer

`src/components/site/SiteFooter.tsx`

- A black section at the end of every page with the copyright line.
- Site map: Photography (`/`), Blog, About.
- Contact: LinkedIn, GitHub, X, and `mailto:hi@jaisal.xyz`.

### Theme

`src/app/(site)/Providers.tsx`, `src/components/site/site.module.css`

- Light/dark mode follows `prefers-color-scheme` and updates live when the OS
  setting changes.
- A `?theme=dark` or `?theme=light` query param overrides the OS preference.
- Mode is applied as `data-theme` on `<html>` and swaps the design tokens in
  `site.module.css`.
- Public pages are set in Geist, loaded in `SitePage`.

### Analytics and headers

- The Google Analytics `gtag.js` tag loads when `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID`
  is set (`src/app/(site)/SiteDocument.tsx`).
- PostHog loads in the browser when `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` and
  `NEXT_PUBLIC_POSTHOG_HOST` are set (`instrumentation-client.ts`); the server
  logs homepage collection loads and failures (`src/lib/posthog-logs.ts`).
- `vercel.json` adds `X-Content-Type-Options`, `X-Frame-Options: DENY`, and
  `X-XSS-Protection` to every response. It also enables clean URLs.

## Photography

### Collections (home)

`/` → `src/app/(site)/page.tsx`, `Home.tsx`

- A rotating hero, then up to 20 collections, newest created first: each
  collection's cover beside a pinned, numbered index whose active row follows
  the scroll.
- The cover is the collection's first photo. The hero uses a different photo
  from the same collection (its first other landscape photo) so it does not
  repeat the cover.
- Each cover and index row opens the collection.
- If the CMS is unreachable the page renders without its list.
- Statically generated; revalidates every 10 minutes and whenever a collection
  or photo changes in the admin.

### Collection detail

`/collections/[slug]` → `src/app/(site)/collections/[id]/page.tsx`, `Collection.tsx`

- Title, description, month and year, location, and the photos grouped into
  rows by orientation. Photos are not clickable.
- A "next collection" row links to the collection after this one in the home
  order, wrapping to the first.
- Photos show a blurred preview while they load.
- The page title is "Jaisal Friedman - <collection title>".
- Pages are pre-built for every published collection slug.
- An unknown slug, or an unpublished collection, returns 404.
- There is no `/collections` index page. That URL returns 404, even though
  the sitemap lists it.

Content model (`src/collections/Collections.ts`, `Media.ts`): a collection has
title, slug, description, date, location, and `photos[]`. Each photo row is a
title plus a `media` upload. Media files live in Vercel Blob with generated
sizes (`thumbnail`, `card`, `large`, `xl`) and are served through `next/image`.

## Blog

### Blog index

`/blog` → `src/app/(site)/blog/page.tsx`, `BlogIndex.tsx`

- Numbered rows, newest published first, each with the title and publish date
  ("Month D, YYYY", in UTC), linking to the post.

### Blog post

`/blog/[slug]` → `src/app/(site)/blog/[slug]/page.tsx`, `Post.tsx`

- Title, publish date, and the body in a reading column with margin section
  numbers and a reading progress thread.
- The body supports h2 and h3 headings, paragraphs, bullet and numbered lists,
  bold, italic, inline code, links, and code blocks (`richText.ts` maps
  Payload's Lexical body to plain blocks). External links open in a new tab.
- An unknown slug, or an unpublished post, returns 404.

## About

`/about` → `src/app/(site)/about/page.tsx`, `About.tsx`

- Rotating roles and hobbies, word-reveal statements, and a scroll-drawn thread.
- A pinned, playable slot machine (`about/slots/`). Scrolling it into place
  plays the first pull, and progress is saved in the browser.
- An index of collections with their cover photos. It is hidden if the CMS is
  unreachable.

## Not found

`src/app/(site)/not-found.tsx`: a "Page Not Found" page with a link back to
Collections and a "404" heading, inside the normal site shell. It has no CMS
dependency. `src/app/global-not-found.tsx` renders it for URLs that match
neither the site nor the admin.

## Machine-readable routes

- `/llms.txt`: plain-text site summary for AI crawlers, linking Home, About,
  Blog, Collections, robots, and sitemap.
- `/robots.txt`: allows all crawlers and points to the sitemap.
- `/sitemap.xml`: static list of `/`, `/about`, `/blog`, `/collections` on
  `https://www.jaisal.xyz`. Individual collections and posts are not listed.

## Content management

### Payload admin

`/admin/*` → `src/app/(payload)/`, `src/payload.config.ts`

- Requires an admin account. Deployed sites reject public first-user signup;
  create admins with `pnpm run create-admin`.
- Collections: Users, Media, Collections, and Blog Posts.
- Collections and Blog Posts have drafts. Only published documents are visible
  to anonymous visitors, on pages and through `/api/*`.
- Blog post bodies use the Lexical editor with headings, lists, links, and code
  blocks.
- Uploads go from the browser straight to Vercel Blob (the Docker emulator
  locally). Each upload gets generated sizes and a blur placeholder.

### Revalidation

- Publishing, unpublishing, deleting, or changing the slug of a collection or
  post revalidates the affected pages immediately, including the old URL.
  Saving a draft of a never-published document does not.
- Replacing or deleting a photo revalidates the whole site.
- `POST /api/revalidateRoute`: manual revalidation using the headers `secret`
  (matching `REVALIDATE_SECRET`) and `route`.
  - A wrong secret returns 401. A missing route returns 400.
  - Success returns 200 with "Revalidated <route>".
