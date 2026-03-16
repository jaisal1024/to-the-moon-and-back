---
name: dial-back-archivo-usage
overview: Reduce Archivo Black usage so only the biggest hero-style titles use it, and all other headings and navigation use DM Sans.
todos:
  - id: narrow-archivo-theme
    content: Adjust MUI typography in `src/theme.ts` so only the chosen hero variant (e.g. `h1`) uses Archivo Black and all other heading variants use DM Sans
    status: completed
  - id: update-hero-usage
    content: Update page components to use the Archivo Black-backed hero variant for only their main title and DM Sans-backed variants for all other headings
    status: completed
  - id: dm-sans-nav
    content: Ensure navigation and menu typography uses only DM Sans-backed variants
    status: completed
  - id: archivo-visual-pass
    content: Visually review key pages to verify only one Archivo Black hero heading per page and adjust sizes/weights if needed
    status: completed
isProject: false
---

### Goal

Adjust typography so that **only the biggest hero-style titles** use Archivo Black, while **all other headings, navigation, and body text** use DM Sans. This will keep the site bold and distinctive where it matters, without overwhelming pages with heavy display type.

### Current State

- Fonts are loaded via `next/font` in `[src/app/layout.tsx](src/app/layout.tsx)` using `Archivo_Black` and `DM_Sans`, with CSS variables `--font-archivo-black` and `--font-dm-sans` set on the `<html>` element.
- MUI theme in `[src/theme.ts](src/theme.ts)` currently maps:
  - Global `typography.fontFamily` to `var(--font-dm-sans)`.
  - `h1`, `h2`, and `subtitle1` to `var(--font-archivo-black)`.
  - `h3`, `h4`, `body1`, `body2` to `var(--font-dm-sans)`.
- Headings across pages (home, about, blog, collections, nav) are implemented mostly via `Typography` variants (`h1`–`h4`, `subtitle1`).

### High-Level Changes

- **Archivo Black**: Restrict to a **small set of true hero titles only**.
- **DM Sans**: Use for **all other headings, navigation labels, menus, and body text**.
- Achieve this primarily via the **MUI theme**, with **minimal per-component overrides** only where necessary.

### Detailed Plan

- **Step 1: Tighten Archivo Black usage in the MUI theme**
  - Update `[src/theme.ts](src/theme.ts)` typography config so that:
    - `typography.fontFamily` remains `var(--font-dm-sans)` for the base font.
    - **Archivo Black is removed from `h2` and `subtitle1` by default**, reverting them to DM Sans.
    - Only **one variant** (e.g. `h1`) is kept as Archivo Black, or a dedicated hero variant, to be used explicitly where you want a hero title.
  - Example adjustment (conceptually):
    - `h1.fontFamily` → `var(--font-archivo-black)` (hero-level only).
    - `h2`, `h3`, `h4`, `subtitle1`, `body1`, `body2` → `var(--font-dm-sans)`.
- **Step 2: Decide and wire a single “hero” variant**
  - Choose **one** variant to represent hero titles globally (recommended: `subtitle1` or `h1`):
    - If you prefer existing hero styling (large size) to remain tied to `subtitle1`, we can:
      - Set `subtitle1.fontFamily` back to DM Sans, and
      - Introduce a **custom variant** (e.g. `h1` or a new `heroTitle` style defined in `theme.typography`) that uses Archivo Black and the hero sizing.
    - Alternatively, keep `h1` as the only Archivo Black variant and migrate hero headings in components to use `variant="h1"` explicitly.
  - The plan will favor `**h1` as the single Archivo Black variant** to keep configuration simple, and adjust component usage accordingly.
- **Step 3: Update key pages to use Archivo Black only for primary hero titles**
  - Inspect and adjust `Typography` usage in:
    - `[src/app/about/page.tsx](src/app/about/page.tsx)`
    - `[src/app/blog/page.tsx](src/app/blog/page.tsx)`
    - `[src/app/blog/[slug]/page.tsx](src/app/blog/%5Bslug%5D/page.tsx)`
    - `[src/app/collections/[id]/page.tsx](src/app/collections/%5Bid%5D/page.tsx)`
    - `[src/components/NavBar.tsx](src/components/NavBar.tsx)`
  - For each page:
    - Identify the **single hero-level title** (e.g. page title, blog post title, collection title) and ensure it uses the Archivo Black-backed variant (e.g. `h1`).
    - Ensure **all other headings** on the same page use DM Sans-only variants (`h2`, `h3`, `h4`, `subtitle1`) per the updated theme.
  - This ensures multiple headings on a page no longer all appear in Archivo Black—only the true hero title does.
- **Step 4: Ensure navigation and menus use DM Sans**
  - In `[src/components/NavBar.tsx](src/components/NavBar.tsx)` and any other navigation/menu components:
    - Verify the `Typography` variants used for nav labels and mobile menu section titles (e.g. `h3`, `h4`, `body2`).
    - Confirm that those variants are mapped to DM Sans in the theme, or, if any are tied to the Archivo Black variant (e.g. `h1`), switch the nav text to a DM Sans-only variant like `body1`, `body2`, or `h4` that is configured to use DM Sans.
  - This guarantees nav and menu areas stay lighter and do not accidentally use Archivo Black.
- **Step 5: Visual review and fine-tuning**
  - After adjustments:
    - Check each main page (home, about, blog index, blog post, collections) to confirm there is **exactly one Archivo Black heading** per page (where appropriate), and that it is clearly the primary hero title.
    - Validate that all other headers and nav text render in DM Sans, with readable hierarchy (size/weight) but not heavy display styling.
    - If any hero titles feel too subtle or too strong after the change, fine-tune their `fontSize`, `lineHeight`, or `letterSpacing` in the chosen hero variant without re-expanding Archivo Black usage.

### Result

With this plan, Archivo Black is constrained to a **single, intentional hero title per page**, and DM Sans is used everywhere else (secondary headings, body, nav), eliminating the current issue where too many headings render in Archivo Black and making the overall typography feel more balanced and focused.