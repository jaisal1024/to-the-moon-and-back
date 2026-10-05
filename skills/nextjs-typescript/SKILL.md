---
name: nextjs-typescript-best-practices
description: Best practices for building Next.js 13 (Pages Router) applications with TypeScript, covering component patterns, rendering strategies, type safety, error handling, and code organization.
---

# Next.js + TypeScript Best Practices

## TypeScript

### Strict Mode

Always use `strict: true` in `tsconfig.json` to catch subtle bugs early.

### Infer `getStaticProps` Types

Use `InferGetStaticPropsType` to automatically type page props from `getStaticProps`:

```tsx
export default function MyPage({ data }: InferGetStaticPropsType<typeof getStaticProps>) { ... }
export async function getStaticProps() { return { props: { data: ... } }; }
```

### Explicit Prop Types

Define explicit TypeScript interfaces or types for all component props. Never use `any` or untyped props.

```tsx
type Props = { title: string; href: string };
function MyComponent({ title, href }: Props) { ... }
```

### Centralize Types

For shared data shapes, define types in `src/utils/types.ts` or co-locate with the feature. Never duplicate type definitions.

### Payload Generated Types

Always use the types Payload generates in `src/payload-types.ts` (for example `Collection`, `Post`, `Media`) for CMS data. Do not hand-write types for CMS documents; run `bun run payload:types` after changing a collection.

---

## Component Patterns

### Functional Components Only

Always use functional components with React Hooks. Never use class components.

### Co-locate Related Logic

Keep component-specific hooks, types, and helpers near their component unless shared across multiple components.

### Early Returns for Guards

```tsx
if (!data) return <LoadingSpinner />;
if (error) return <ErrorMessage />;
return <MainContent data={data} />;
```

### Avoid Prop Drilling

Fetch data in the server component that needs it (via `src/cms/*`) or use React Context, rather than drilling props through multiple layers.

### Memoization

Use `useCallback` for callbacks passed as props or used in `useEffect` dependency arrays:

```tsx
const handleClick = useCallback(() => { ... }, [dependency]);
```

Use `useMemo` for expensive derived computations:

```tsx
const sortedItems = useMemo(() => [...items].sort(), [items]);
```

---

## Next.js Pages Router Patterns

### SSG with ISR

Prefer SSG + ISR over SSR. Use `getStaticProps` + `revalidate`:

```ts
return { props: { ... }, revalidate: 600 }; // 10 minutes
```

### Dynamic Routes + `getStaticPaths`

Always provide `getStaticPaths` for dynamic routes. Use `fallback: 'blocking'` to gracefully handle new paths:

```ts
return { paths: [...], fallback: 'blocking' };
```

### Error Handling in `getStaticProps`

Always throw meaningful errors in `getStaticProps` — silent failures lead to stale or empty pages:

```ts
if (!data) throw new Error(`getStaticProps: empty data for route ${context.params.id}`);
```

### `getStaticProps` Console Logging

Include a `console.log` at the start of each `getStaticProps` call identifying the route being rendered — this is invaluable for debugging build logs.

---

## Performance

### Image Priority

Use `priority` prop on `next/image` for above-the-fold images (first 2 in a grid):

```tsx
<Image priority={index < 2} ... />
```

### Server-Side Data for Client Components

Fetch CMS data in server components through `src/cms/*` and pass it to client components as props (for example, `Layout` passes the nav collections to `NavBar`). Never import `payload` or `@payload-config` into a `'use client'` file.

### Avoid Large Build-Time Payloads

Be careful with reads that populate deeply nested data. `listCollections` populates every photo per collection just to show the cover; use `select` and `depth` in `src/cms/*` to fetch only what a page renders.

---

## Code Quality

- Run `yarn type-check` before committing to catch type errors without building
- Run `yarn lint` to enforce ESLint rules (import sort, unused imports, TypeScript)
- Use `yarn format` to auto-format with Prettier
- Imports must be sorted (enforced by `eslint-plugin-simple-import-sort`)
