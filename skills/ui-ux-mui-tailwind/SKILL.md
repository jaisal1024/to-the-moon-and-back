---
name: ui-ux-mui-tailwind
description: UI/UX best practices for this project's dual-styling system (MUI v5 + Tailwind CSS), covering theme usage, responsive patterns, accessibility, and visual consistency.
---

# UI/UX Best Practices: MUI + Tailwind

## Dual Styling System

This project uses MUI for component styling and Tailwind for layout/spacing utilities. They must work in harmony:

- **MUI** → typography variants, component state (hover, focus, disabled), elevation, color palette
- **Tailwind** → layout (`flex`, `grid`), spacing (`p-`, `m-`, `space-`), responsive breakpoints (`sm:`, `lg:`), position (`relative`, `absolute`)

> ❌ Never override MUI component styles with inline `style={{}}` unless absolutely necessary
> ✅ Use `sx` prop for MUI-specific overrides, Tailwind classes for layout

---

## Typography

Always use MUI `<Typography>` with the correct semantic variant rather than raw HTML tags:

| Variant | Use Case |
|---|---|
| `h1` | Page title (Futura PT, 36px, 700, uppercase) |
| `h2` | Site name / major headings |
| `h3` | Section headings, dates, locations |
| `h4` | Nav items, secondary labels |
| `subtitle1` | Hero text, large body (48px) |
| `body1` | Regular body copy (16px) |
| `body2` | Small/secondary text (14px) |

Font families (configured in `src/theme.ts`):
- **Futura PT** → h1, h2, all variants (default fallback: sans-serif)
- **Proxima Nova** → h3, h4, body1, body2

---

## Color Palette

Defined in `src/colors.js` and `src/theme.ts`:

| Name | Hex | Usage |
|---|---|---|
| `white` | `#FFFFFF` | Primary color, backgrounds |
| `carbon` | (dark) | Secondary color, all text |
| `dangerRed` | (red) | Error states, error messages |

> Tailwind classes like `text-orange-500`, `text-blue-400`, `text-[#5ee5b6]` are used for accent colors on the About page. For any new accent colors, prefer Tailwind's named palette or define a Tailwind config extension.

---

## Responsive Layout

Use Tailwind's responsive prefix modifiers for breakpoints:
- `sm:` → 640px+ (tablet)
- `lg:` → 1024px+ (desktop)
- `xl:` → 1280px+ (large desktop)

### Mobile-First Pattern
```tsx
// Mobile: stacked, Desktop: row
<div className="flex flex-col sm:flex-row">
```

### Hide/Show by Breakpoint
```tsx
// Hidden on mobile, visible on sm+
<div className="hidden sm:block">...</div>
// Visible on mobile, hidden on sm+
<IconButton className="sm:hidden">...</IconButton>
```

---

## MUI Grid for Photo Layouts

Use `<Grid container>` and `<Grid xs={12} lg={6}>` for responsive 1-column (mobile) to 2-column (desktop) photo grids:
```tsx
<Grid container>
  {items.map((item) => (
    <Grid xs={12} lg={6} key={item.id}>
      ...
    </Grid>
  ))}
</Grid>
```

---

## Interactive Elements

### Active Link Indication
Use `underline underline-offset-8` Tailwind class to indicate the currently active route. Check `router.asPath` or `router.pathname` and apply conditionally with `clsx`:
```tsx
className={clsx(isActive && 'underline underline-offset-8')}
```

### Hover States
For clickable non-button elements, use `cursor-pointer` and provide visual feedback via Tailwind hover utilities:
```tsx
className="cursor-pointer opacity-70 hover:opacity-100"
```

---

## Images

Always use the `NextImage` wrapper component (not bare `next/image`) when rendering Sanity photos. It handles the Sanity → CDN URL transformation.

```tsx
// ✅ Correct
<NextImage image={photo} alt={title} fill />

// ❌ Incorrect - bypasses Sanity URL transform
<Image src={photo.url} alt={title} fill />
```

For layout: use `fill` + `objectFit: 'contain'` for photo display (preserves aspect ratio):
```tsx
<NextImage fill style={{ objectFit: 'contain', objectPosition: 'center' }} />
```

---

## Accessibility

- Always provide meaningful `alt` text for images
- Use `aria-label` on icon-only buttons (e.g., close button, menu button)
- Semantic HTML: use `<nav>`, `<main>`, `<footer>` appropriately inside Layout/NavBar/Footer
- Ensure color contrast meets WCAG AA (the current carbon-on-white scheme is safe)

---

## Animation

Keep animations minimal and purposeful. The site uses:
- `AnimatedSpan` component for text cycling on the About page
- CSS `fadeIn` animation defined in `src/styles/animate.css`

> When adding new animations, prefer CSS animations over JS-driven ones for performance. Respect `prefers-reduced-motion`.

---

## Loading States

Always show a loading indicator when data is being fetched client-side:
```tsx
{loading && <LoadingSpinner />}
{error && <Typography className="text-dangerRed">Error message</Typography>}
{data && <Content data={data} />}
```
