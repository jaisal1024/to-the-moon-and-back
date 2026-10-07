# Component Reference

All UI components live in `src/components/`. They are built using a combination of **MUI (Material UI)** and **Tailwind CSS** utility classes.

---

## `Layout`

**File:** `src/components/Layout.tsx`

Wraps every page with a consistent shell: `NavBar` at the top, then a padded content area, and `Footer` at the bottom.

**Usage:**

```tsx
<Layout>
  <YourPageContent />
</Layout>
```

---

## `NavBar`

**File:** `src/components/NavBar.tsx`

Responsive top navigation bar. Features:

- **Desktop**: Shows brand name (link to `/`), a **Collections** dropdown, and **Blog** and **About** links
- **Mobile**: Hamburger icon opens a fullscreen `Dialog` with Collections, Blog, and About

Key behaviors:

- Active link detection via `usePathname()` — active links get `underline` styling
- Takes a `collections` prop from the server-rendered `Layout` (`listNavCollections`), so the menu opens without a loading state

**Internal sub-components:**

- `CollectionListItem` — single nav list item with active underline
- `CollectionList` — renders Home plus every collection passed in

---

## `ImageGrid`

**File:** `src/components/ImageGrid.tsx`

A responsive 2-column grid of photos with optional overlay buttons. Used on both:

- `/` (homepage) — shows all collections, each with a cover photo and a link button
- `/collections/[slug]` — shows all photos in a single collection

**Props:**

```ts
type Props = {
  collection: {
    key: string | number;
    title?: string | null;
    photo: Media | number; // Payload media document (or an unpopulated id, which renders nothing)
    button?: { title: string; href: string };
  }[];
};
```

- The first 2 images are preloaded for LCP; images use `sizes` so `next/image` serves half-width variants on large screens
- Clicking anywhere on the grid item navigates to the button's `href`

---

## `NextImage`

**File:** `src/components/NextImage.tsx`

A thin wrapper around `next/image` for Payload `Media` documents. It picks one of the generated sizes (`thumbnail`, `card`, `large`, `xl`; default `xl`) through `mediaSource`, passes its intrinsic dimensions unless `fill` is set, and uses the media's alt text when none is given.

---

## Metadata API

**Location:** `src/app/(site)/layout.tsx` (global) and individual `page.tsx` files.

The project uses the native **Next.js Metadata API** for SEO and header management. This replaces the legacy `PageTitle` component and provides better integration with the App Router.

- **Static Metadata**: Defined via `export const metadata: Metadata` in page files.
- **Dynamic Metadata**: Generated via `export async function generateMetadata()` for dynamic routes like `/collections/[slug]`.

---

## `AnimatedSpan`

**File:** `src/components/AnimatedSpan.tsx`

Cycles through an array of strings with a CSS fade animation. Used on the About page to animate alternating text (e.g., "software engineer", "photographer").

**Props:**

```ts
{ items: string[] } & React.HTMLProps<HTMLSpanElement>
```

> ⚠️ If you change the CSS animation duration in `animate.css`, also update the `transitionTotal` constant in this file (it must stay in sync).

---

## `Link`

**File:** `src/components/Link.tsx`

A custom link component that wraps both `next/link` (for internal navigation) and standard `<a>` tags (for external). Provides a `noLinkStyle` prop to strip default anchor styling.

---

## `Footer`

**File:** `src/components/Footer.tsx`

Site footer with social links (Instagram, LinkedIn, GitHub, email). Rendered by `Layout`.

---

## Component Architecture Notes

- **No global state library** — state is local (`useState`); CMS data is fetched in server components and passed down as props
- **Dual styling**: MUI handles component styles and typography; Tailwind handles layout and responsive utilities
- All components use **functional components** with React Hooks
- CMS types come from the Payload-generated `src/payload-types.ts`
