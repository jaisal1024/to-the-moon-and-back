---
name: semantic-color-tokens-dark-light
overview: Introduce semantic color tokens for light and dark mode and replace direct color usages like divide-carbon with semantic classes so the site looks correct in both themes.
todos:
  - id: define-semantic-css-vars
    content: Add light/dark semantic color CSS variables (border, surface, text, accent) in src/styles/globals.css mapped to existing brand tokens.
    status: completed
  - id: extend-tailwind-semantic-colors
    content: Extend tailwind.config.js with semantic color keys wired to the new CSS variables.
    status: completed
  - id: refactor-layout-footer-borders
    content: Refactor Layout and Footer to replace raw carbon-based classes (e.g. divide-carbon, border-carbon) with semantic Tailwind utilities.
    status: completed
  - id: refactor-site-colors-semantic
    content: Scan src/app and src/components for direct structural color usages and replace them with semantic utilities while keeping brand accents intact.
    status: completed
  - id: tune-and-test-semantic-themes
    content: Test key pages in light and dark modes and iterate on semantic token values to ensure good contrast and visual consistency.
    status: completed
isProject: false
---

### Goal

- **Unify colors behind semantic tokens** so components use meanings like `border-subtle`, `text-muted`, `surface-elevated` instead of raw tokens like `carbon`, and **ensure each semantic token has light/dark values**.

### 1. Define semantic tokens for borders, text, and surfaces

- **Add a semantic token map in `[src/styles/globals.css](src/styles/globals.css)`**:
  - Within `:root` / `:root[data-theme='dark']`, introduce variables like:
    - `--color-border-subtle`, `--color-border-strong`.
    - `--color-surface-default`, `--color-surface-elevated`.
    - `--color-text-muted`, `--color-text-strong`, `--color-accent`.
  - In light mode, map these to existing brand tokens (`--color-carbon`, `--color-paleTangerine`, etc.); in dark mode, map to appropriate inverted/adjusted values (e.g. darker surfaces, lighter borders/text) while preserving the overall aesthetic.
- **Align MUI palette with semantic tokens** in `[src/theme.ts](src/theme.ts)`:
  - Ensure `palette.background.default` / `paper`, `text.primary` / `secondary`, and `divider` approximate the same colors as `--color-surface-default`, `--color-surface-elevated`, and border tokens for both modes.

### 2. Add Tailwind utilities for semantic colors

- **Extend Tailwind theme to expose semantic classes** in `[tailwind.config.js](tailwind.config.js)`:
  - Under `theme.extend.colors`, add keys like `borderSubtle`, `borderStrong`, `surface`, `surfaceElevated`, `textMuted`, `textStrong`, `accent` that point to `rgb(var(--color-...))` or direct CSS variable references.
  - Keep existing raw tokens (like `carbon`) for low-level use but mark new semantic names as preferred.
- **Configure dark mode behavior if needed**:
  - Confirm whether `darkMode` is already configured. If not, keep the current approach of using `data-theme` + CSS variables, and treat Tailwind semantic colors as always reading from the same CSS variables, which flip between light/dark behind the scenes.

### 3. Replace raw structural colors with semantic ones

- **Refactor layout and footer**:
  - In `[src/components/Layout.tsx](src/components/Layout.tsx)` and `[src/components/Footer.tsx](src/components/Footer.tsx)`, replace structural classes like `divide-carbon`, `border-carbon`, `text-...` with semantic equivalents:
    - e.g. `divide-borderSubtle`, `border-borderSubtle`, `text-textMuted`, `bg-surface` / `bg-surfaceElevated` as appropriate.
  - Ensure footer text and dividers have sufficient contrast in dark mode while still looking subtle in light mode.
- **Update other key pages/components using carbon directly**:
  - Scan `src/app` and `src/components` for classes like `border-carbon`, `divide-carbon`, `text-carbon`, and replace with the new semantic utilities where the intent is structural (borders, headings, muted copy) rather than brand accents.

### 4. Preserve brand accent colors with dedicated semantics

- **Define accent semantics**:
  - In `globals.css`, add variables for accent usages such as `--color-accent-primary` (e.g. tangerine), `--color-accent-link`, with slightly tweaked dark-mode values to avoid neon or low contrast.
  - In `tailwind.config.js`, expose them as `accentPrimary`, `accentLink`, etc., and migrate places like `className="text-orange-500"` or `text-blue-500` on the about page and links to use these semantic accents.

### 5. Test across light/dark modes

- **Visual regression pass**:
  - In both light and dark OS themes, check:
    - Blog index cards and headings.
    - Collections grid and detail pages.
    - Footer sections and borders.
    - NavBar and dialog/popover surfaces.
  - Ensure borders, dividers, and muted text are readable but not overpowering, and that semantic accent colors remain consistent across pages.
- **Adjust token values as needed**:
  - If any area still looks off (e.g. footer too low-contrast in dark mode), tweak only the semantic variable values in `globals.css` so all dependent components improve together.

