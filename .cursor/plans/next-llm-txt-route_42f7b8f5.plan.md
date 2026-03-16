---
name: next-llms-txt-and-seo-routes
overview: Add an llms.txt markdown endpoint at the site root in the Next.js app, plus standard robots.txt and sitemap.xml routes, to help AI crawlers and search engines understand and navigate the site.
todos:
  - id: inspect-routing-structure
    content: Check whether the app uses the App Router (`app` directory), Pages Router (`pages` directory), or both, and note existing text/metadata routes to mirror patterns.
    status: completed
  - id: create-llms-txt-route
    content: Add a new route file that serves `/llms.txt` as `text/plain` using the appropriate Next.js routing convention for this project, returning markdown content.
    status: completed
  - id: write-llms-txt-content
    content: Author friendly, standard markdown `llms.txt` content that introduces the site to AI crawlers and provides curated links to the most important pages.
    status: completed
  - id: create-robots-route
    content: Add a new route that serves `/robots.txt` with an allow-all policy and a reference to the sitemap.
    status: completed
  - id: create-sitemap-route
    content: Add a new route that serves `/sitemap.xml` as XML listing all main public pages on the site.
    status: completed
  - id: align-with-lint-and-types
    content: Ensure the new routes follow existing TypeScript, linting, and style conventions so that `bun run check` passes.
    status: completed
  - id: manual-verify-text-and-xml-routes
    content: Verify in a dev environment that `/llms.txt`, `/robots.txt`, and `/sitemap.xml` return 200 with the correct content types and bodies.
    status: completed
isProject: false
---

### Goal

Create an `llms.txt` route served from the site root in the existing Next.js app (using the Next.js conventions already in this repo) that provides a markdown, friendly introduction and metadata for AI crawlers, and add complementary `robots.txt` and `sitemap.xml` routes.

### High-level approach

- **Determine routing style**: Detect whether the app uses the `app` directory, `pages` directory, or both, and choose the idiomatic place to define plain-text and XML routes.
- **Implement `llms.txt` handler**: Add a route file that responds with markdown `text/plain` content at `/llms.txt`.
- **Implement `robots.txt` handler**: Add a route that serves an allow-all robots policy and links to the sitemap.
- **Implement `sitemap.xml` handler**: Add a route that serves XML listing the main public pages of the site.
- **Wire into CI/linting**: Ensure the new files follow existing TypeScript, Next.js, and linting conventions so that `bun run check` continues to succeed.

### Detailed steps

**1. Inspect routing structure**

- Look at `[root]/app` and `[root]/pages` to see which Next.js routing system is in use (Next 16 suggests `app` router, but confirm).
- Note any existing special text or metadata routes (e.g., `robots.txt`, `sitemap.xml`) to mirror patterns.

**2. Add `llms.txt` route file**

- **If using the App Router**:
  - Under `app`, create `[root]/app/llms.txt/route.ts` exporting a `GET` handler returning a `Response` with `Content-Type: text/plain; charset=utf-8`.
- **If using the Pages Router**:
  - Create `[root]/pages/llms.txt.ts` exporting a default handler using `NextApiRequest`/`NextApiResponse`, or in newer Next, a basic handler using `GetServerSidePropsContext` that writes headers and the body and ends the response.
- Ensure the response:
  - Sets `Content-Type` to `text/plain; charset=utf-8`.
  - Returns a static markdown string body (no heavy computation) for performance and simplicity.

**3. Draft `llms.txt` markdown content**

- Use a standard, structured markdown format inspired by the proposed `llms.txt` spec:
  - `# Site Name`.
  - A blockquote with a brief description of what the site does.
  - An “Important notes” bullet list capturing key differentiators or guidance for AI systems.
  - One or more sections (e.g., `## Products`, `## Blog Content`, `## Company`) each containing `[link text](url): short description` entries pointing to high-signal pages.
  - References to `robots.txt` and `sitemap.xml` so crawlers can discover broader crawl rules and URL listings.
- Keep the content curated, concise, and oriented toward AI crawlers while still human-readable.

**4. Add `robots.txt` route**

- Implement a route for `/robots.txt` using the same routing style as the rest of the app:
  - App Router: `[root]/app/robots.ts` (Next metadata helper) or `[root]/app/robots.txt/route.ts` with a `GET` handler.
  - Pages Router: `[root]/pages/robots.txt.ts` that writes a plain-text body.
- Serve a simple, standards-compliant allow-all policy:
  - `User-agent: `*
  - `Allow: /`
  - `Sitemap: https://your-domain.com/sitemap.xml`
- Set `Content-Type` to `text/plain; charset=utf-8`.

**5. Add `sitemap.xml` route**

- Implement a route for `/sitemap.xml`:
  - App Router: `[root]/app/sitemap.ts` (Next metadata helper) or `[root]/app/sitemap.xml/route.ts` with a `GET` handler.
  - Pages Router: `[root]/pages/sitemap.xml.ts` returning XML.
- Introduce a shared `SITE_URL` config constant reused by `llms.txt`, `robots.txt`, and `sitemap.xml`.
- Build an array of main public URLs (home page, key sections, and other high-value pages) and serialize them into a valid `<urlset>` XML document.
- Set `Content-Type` to `application/xml; charset=utf-8`.

**6. Integrate with project conventions**

- Match existing code style: TypeScript types, import style, and any custom `logger` usage patterns (if the routes need logging at all; ideally keep them pure and side-effect-free).
- Ensure exported route handlers use the standard async `GET()` signature for the App Router or standard API handler patterns for the Pages Router, consistent with existing project files.

**7. Validate behavior**

- Run the dev server (outside of this plan) and hit:
  - `http://localhost:3333/llms.txt`
  - `http://localhost:3333/robots.txt`
  - `http://localhost:3333/sitemap.xml`
- Confirm for each:
  - The route exists and returns HTTP 200.
  - The response `Content-Type` matches expectations (`text/plain` for `llms.txt` and `robots.txt`, `application/xml` for `sitemap.xml`).
  - Body content matches the intended text or XML.
- Run `bun run lint` and `bun run type-check` to confirm no TypeScript or lint issues are introduced.

### Notes / assumptions

- Assume you want the routes at `/llms.txt`, `/robots.txt`, and `/sitemap.xml` at the domain root.
- Assume no need for per-environment variation; these routes can be identical across environments, except for the base URL constant if needed.
- If you later want more detailed or policy-oriented `llms.txt` content, we can iterate on the markdown body in the same route file.

