# Component Reference

Every public page shares one design system in `src/components/site/`. Each page's own presentation lives next to its route in `src/app/(site)/`, styled with a CSS module.

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

Each route's `page.tsx` is a server component: it fetches from the CMS, maps the result to plain props, and renders a client component that knows nothing about the CMS (Payload, read through `src/cms/`). That keeps the CMS swappable.

| Route               | Page component                                   | Notes                                                                                                                                   |
| ------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                 | `src/app/(site)/Home.tsx`                        | Rotating hero, covers beside a pinned numbered index whose active row follows the scroll                                                |
| `/collections/[id]` | `src/app/(site)/collections/[id]/Collection.tsx` | Photos grouped into rows by orientation (`rows.ts`, unit tested), description revealed word by word, next collection row                |
| `/blog`             | `src/app/(site)/blog/BlogIndex.tsx`              | Numbered post rows                                                                                                                      |
| `/blog/[slug]`      | `src/app/(site)/blog/[slug]/Post.tsx`            | Reading column, margin section numbers, code plates, reading progress thread. `richText.ts` maps Payload's Lexical body to plain blocks |
| `/about`            | `src/app/(site)/about/About.tsx`                 | Rotating roles, word-reveal statements, scroll-drawn thread, the slot machine (below), collections index                                |
| 404                 | `src/app/(site)/not-found.tsx`                   | No CMS dependency                                                                                                                       |

### Slot machine — `src/app/(site)/about/slots/`

The about page's night chapter opens with a pinned, playable slot machine. Scrolling it into place plays the first pull; a visitor's very first pull is a free, guaranteed jackpot (once per visitor, remembered in the save).

**The game** (no React, no DOM):

| File         | What it holds                                                                                                                                                                                                                                               |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `engine.ts`  | Pure functions with an injectable random source: reel strips, paytable, `spin(state, rng)`, moon meter and free spins, shooting star, moon loan, `fromSaved`. Rules, odds and the long-run return are documented at the top and checked by `engine.test.ts` |
| `storage.ts` | Loading and saving under `moon-slots:v2`, migrating older saves                                                                                                                                                                                             |
| `words.ts`   | `WORDS`: every word the machine says (sign lines, quips, labels). Edit here                                                                                                                                                                                 |
| `pixels.ts`  | Pixel art as SVG path data: the eight symbols, the 5x7 sign font, the meter moon                                                                                                                                                                            |

**The show** (`SlotMachine.tsx` composes these):

| File                                                                                                    | What it does                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `useSlotGame.ts`                                                                                        | Holds the engine state, saves it, adopts a newer save from another tab. `revealed` is the state the screen has caught up to; everything shown derives from it      |
| `useShow.ts` + `choreography.ts`                                                                        | `play()` takes one pull from the engine, then reveals it beat by beat. The choreography is a table of plain async scripts keyed by outcome kind                    |
| `useFrameLoop.ts`                                                                                       | The single `requestAnimationFrame` loop. Everything that moves registers a step with it                                                                            |
| `useReels.ts`, `useParticles.ts`, `useShip.ts`, `useCountUp.ts`                                         | The imperative animation: reel transforms, the coin canvas, the rocket's flight, the ticking credit counter                                                        |
| `useLever.ts`, `useShootingStar.ts`, `useScrollEntrance.ts`, `useSound.ts`, `useSky.ts`, `useTimers.ts` | Lever drag and its wandering target, star scheduling, scroll-driven entrance and first pull, Web Audio blips (off by default), the star field, unmount-safe timers |
| `motion.ts`                                                                                             | `isCalm()` (reduced motion or no `matchMedia`) and one-shot moves replayed with the Web Animations API                                                             |
| `Reels`, `Lever`, `Sign`, `Hud`, `Orb`, `StatsBar`, `ShootingStar`, `Pixel`                             | Presentational components                                                                                                                                          |
| `slots.module.css`                                                                                      | Styles. The reels are cream in both themes, so the inks printed on them are fixed locally                                                                          |

The engine decides and saves each pull before anything animates, so the symbols on the payline are the result and the credits always reconcile (`after = before + loan - cost + payout`). The lever is a plunger: taking hold of the knob sets a target wandering along the lever (random direction, speed and turns, so no two drags are alike). Letting go with the knob on it is a perfect pull, which stops the first two reels on a pair; letting go off it is a fumble, which costs double and pays nothing. A plain tap never aims, so it is an ordinary pull. From the keyboard, holding Space pumps the lever past a target that stays put. The lever has `touch-action: none`, so on a phone the drag is never taken for a scroll. Space/Enter only pull while focus is on the lever or the reels. Under reduced motion the reels snap to their result and nothing shakes, rains or flies.

Scroll effects live in a single `useEffect` per page driven by `requestAnimationFrame`. They skip test environments (no `matchMedia` / SVG geometry in jsdom) and show the finished state under `prefers-reduced-motion`.

---

## Metadata API

**Location:** `layout.tsx` (global) and individual `page.tsx` files.

The project uses the native **Next.js Metadata API** for SEO and header management.

- **Static Metadata**: Defined via `export const metadata: Metadata` in page files.
- **Dynamic Metadata**: Generated via `export async function generateMetadata()` for dynamic routes like `/collections/[id]`.
