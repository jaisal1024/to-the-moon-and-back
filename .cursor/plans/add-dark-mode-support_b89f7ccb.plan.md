---
name: add-dark-mode-support
overview: Add a global dark mode for the site that automatically follows the user’s system preference, wiring it through MUI theme, Tailwind, and the Next.js layout without adding a visible toggle.
todos:
  - id: inspect-providers
    content: Inspect and understand the current MUI/Next.js provider setup in Providers and related files to see how the theme is wired today.
    status: completed
  - id: extend-theme-modes
    content: Extend src/theme.ts to define light and dark theme variants with appropriate palette configurations and a helper for selecting the theme by mode.
    status: completed
  - id: root-layout-mode
    content: Update src/app/layout.tsx so RootLayout applies a data-theme attribute based on prefers-color-scheme and passes the mode to the providers without exposing a user toggle.
    status: completed
  - id: globals-dark-variables
    content: Update src/styles/globals.css (and Tailwind config if needed) to add data-theme-based variables for light and dark mode and ensure Tailwind dark variants work if used.
    status: completed
  - id: component-audit
    content: Audit NavBar and key pages/components to replace hard-coded colors with theme-aware values that look good in both light and dark mode.
    status: completed
  - id: test-dark-mode
    content: Test dark mode behavior by changing OS appearance and verifying consistent theming across MUI components, Tailwind utilities, and custom CSS, adjusting edge cases as needed.
    status: completed
isProject: false
---

### High-level approach

- **Goal**: Introduce a dark mode that **automatically** matches the user’s OS preference (via `prefers-color-scheme`) and applies consistently across MUI components, Tailwind utility classes, and custom global styles, **without any user-visible toggle**.
- **Strategy**: Define coordinated light/dark theme tokens in the existing MUI `theme`, add corresponding CSS/Tailwind variables, and have the Next.js root layout apply the correct scheme (and class) as early as possible to avoid a flash of incorrect theme.

### 1. Extend the theme to support light and dark variants

- **Create dual palettes** in `[src/theme.ts](src/theme.ts)`:
  - Add a `themeLight` and `themeDark` (or a function `createAppTheme(mode)`), using existing color tokens like `carbon`, `white`, `dangerRed` and adding appropriate dark equivalents (e.g. darker backgrounds, lighter text).
  - Ensure `palette.mode` is set to `'light'` or `'dark'` accordingly and that `palette.background.default`, `palette.text.primary`, and primary/secondary colors look good in both modes.
- **Export a helper** for selecting the theme by mode:
  - Either export both themes and a small helper function, or export a `getThemeForMode(mode: 'light' | 'dark')` that encapsulates palette choices.
- **Keep typography and fonts shared** so we don’t duplicate that configuration.

### 2. Wire theme mode into the React/MUI provider layer

- **Inspect `[src/app/Providers.tsx](src/app/Providers.tsx)`** (or equivalent) to see how the MUI theme provider is set up now.
- **Introduce a theme mode context or prop**:
  - Accept a `mode: 'light' | 'dark'` from `RootLayout` and choose the proper MUI theme (`themeLight` or `themeDark`).
  - Ensure all MUI components (e.g. `NavBar`, dialogs, app bars) receive the correct theme via the existing provider tree.
- **Adopt existing patterns** in the provider setup (functional components, `React.memo` where appropriate, using the existing logger if any initialization logs are needed).

### 3. Integrate OS preference into the Next.js root layout

- **Update `RootLayout` in `[src/app/layout.tsx](src/app/layout.tsx)`**:
  - Replace the hard-coded `body` background inline style that currently uses `theme.palette.background.default`.
  - Add a small inline script in `<head>` (or before `<body>`) that:
    - Reads `window.matchMedia('(prefers-color-scheme: dark)')` on the client.
    - Sets a `data-theme="dark"` or `data-theme="light"` attribute on `<html>` **before React hydration** to minimize flash.
  - Pass the detected mode down to `Providers` via a prop or use a lightweight client-side hook that syncs the initial mode with the `data-theme` attribute.
- **Keep behavior purely automatic**:
  - Do not store any override in local storage or expose a UI toggle; always recompute from `prefers-color-scheme`.

### 4. Add CSS/Tailwind hooks for light/dark styling

- **Update `[src/styles/globals.css](src/styles/globals.css)`** to define dark-mode variables:
  - Keep the existing `@theme` block for light colors as the default.
  - Introduce a `:root[data-theme='light']` and `:root[data-theme='dark']` (or `.dark` class) section that maps semantic variables like `--color-bg`, `--color-fg`, `--color-accent` to appropriate values in each mode.
  - Where appropriate, keep current light values under `data-theme='light'` and choose balanced dark equivalents for `data-theme='dark'`.
- **Ensure Tailwind integration**:
  - Confirm how dark mode is configured in `tailwind.config` (e.g. `darkMode: 'class'` or `'media'`); adjust if needed so using `data-theme` or a `.dark` class on `<html>` works well.
  - Plan to use dark mode variants like `dark:bg-...` if any components currently rely on Tailwind colors directly.

### 5. Update key components to use theme-aware colors

- **Audit `NavBar` in `[src/components/NavBar.tsx](src/components/NavBar.tsx)` and other prominent components**:
  - Replace any hard-coded color props/classes that conflict with dark backgrounds (e.g. assuming white background or carbon text) with theme-driven values from MUI (`color="inherit"`, `variant`, or `sx` styles using palette tokens) or CSS variables.
  - Ensure dialogs, popovers, and app bar backgrounds look correct in both modes.
- **Check the `about` page and other main pages** for any direct color usage that must be updated to be legible in dark mode.

### 6. Handle SSR + hydration edge cases and testing

- **Minimize flash of wrong theme**:
  - Ensure the initial HTML from the server defaults to a reasonable mode (likely light) and that the client-side `prefers-color-scheme` script swaps to dark quickly when needed.
- **Testing**:
  - Manually test in browsers by toggling OS appearance (light/dark) and reloading the site to confirm the mode matches, including:
    - Backgrounds and text.
    - MUI app bar, dialogs, popovers.
    - Tailwind-based elements.
  - Optionally add a simple Cypress/Playwright or Jest + Testing Library test that can simulate dark mode via `matchMedia` mocking and assert that `data-theme` and MUI palette mode update as expected.

### 7. Performance, logging, and maintainability considerations

- **Performance**:
  - Keep the theme selection logic minimal and memoized (e.g. `useMemo` in providers) to avoid re-creating themes on every render.
- **Logging**:
  - If any logging is added for theme initialization or mode detection, use the existing `logger` utility instead of `console`.
- **Maintainability**:
  - Centralize dark-mode color decisions in `theme.ts` and a small set of CSS variables, so future changes to the palette only require edits in a couple of places.
