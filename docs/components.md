# Component Reference

Every public page shares one design system in `src/components/site/`. Each page's own presentation lives next to its route in `src/app/`, styled with a CSS module.

---

## Site shell — `src/components/site/`

### `SitePage`

**File:** `src/components/site/SitePage.tsx`

Wraps every public page: loads the Geist font, applies the design tokens, renders the `TopBar`, the page content in `<main>`, and the `SiteFooter`.

```tsx
<SitePage>
  <Home {...props} />
</SitePage>
```

### `site.module.css`

The shared tokens and classes. Pages use the tokens (`--paper`, `--text`, `--accent`, `--accent-2`, `--thread-1..3`, `--pad`, `--gap`, `--mat`, `--rule`, `--muted`, and the type scale `--xl` / `--lg` / `--md` / `--sm`) and never hard-code colours, so dark theme works everywhere. Shared classes, imported as `shell`:

- `shell.frame` + `shell.inner` — the black mat every photo sits in
- `shell.night` — black sections with cream text and a lightened blue accent
- `shell.pill`, `shell.link`, `shell.u`, `shell.muted`, `shell.xl`, `shell.lg`, `shell.sm`

Dark theme overrides the tokens under `[data-theme='dark']`, which `Providers` sets on `<html>`.

### `TopBar`

**File:** `src/components/site/TopBar.tsx`

Fixed bar with Collections / Blog / About and the name linking home. It uses `mix-blend-mode: difference` so it reads over cream, black and photos, marks the current section with `aria-current`, and slides away while scrolling down.

### `SiteFooter`

**File:** `src/components/site/SiteFooter.tsx`

Site map, contact links and the copyright line, in a black section at the end of every page.

---

## Pages

Each route's `page.tsx` is a server component: it fetches from the CMS, maps the result to plain props, and renders a client component that knows nothing about Sanity. That keeps the CMS swappable.

| Route               | Page component                            | Notes                                                                                                                          |
| ------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `/`                 | `src/app/Home.tsx`                        | Rotating hero, covers beside a pinned numbered index whose active row follows the scroll                                       |
| `/collections/[id]` | `src/app/collections/[id]/Collection.tsx` | Photos grouped into rows by orientation (`rows.ts`, unit tested), description revealed word by word, next collection row       |
| `/blog`             | `src/app/blog/BlogIndex.tsx`              | Numbered post rows                                                                                                             |
| `/blog/[slug]`      | `src/app/blog/[slug]/Post.tsx`            | Reading column, margin section numbers, code plates, reading progress thread. `richText.ts` maps Portable Text to plain blocks |
| `/about`            | `src/app/about/About.tsx`                 | Rotating roles, word-reveal statements, scroll-drawn thread, flip cards, collections index                                     |
| 404                 | `src/app/not-found.tsx`                   | No CMS dependency                                                                                                              |

Scroll effects live in a single `useEffect` per page driven by `requestAnimationFrame`. They skip test environments (no `matchMedia` / SVG geometry in jsdom) and show the finished state under `prefers-reduced-motion`.

---

## Metadata API

**Location:** `layout.tsx` (global) and individual `page.tsx` files.

The project uses the native **Next.js Metadata API** for SEO and header management.

- **Static Metadata**: Defined via `export const metadata: Metadata` in page files.
- **Dynamic Metadata**: Generated via `export async function generateMetadata()` for dynamic routes like `/collections/[id]`.
