# CV Forge architecture

## Stack (verified at implementation time)

| Layer         | Choice                                                      | Notes                                       |
| ------------- | ----------------------------------------------------------- | ------------------------------------------- |
| App framework | SvelteKit 3 + Svelte 5                                      | Runes mode for app components               |
| Runtime / PM  | Bun 1.4+                                                    | `@sveltejs/adapter-bun` requires Bun 1.4+   |
| Validation    | Zod 4                                                       | `z.strictObject` for canonical CV schema    |
| Markdown      | unified, remark-parse, remark-gfm, remark-frontmatter, yaml | Structural mdast mapping, no HTML execution |
| PDF render    | Playwright Chromium `page.pdf`                              | A4, print CSS, externalized from SSR bundle |
| PDF metadata  | pdf-lib                                                     | Title/author after render                   |
| PDF text      | pdfjs-dist                                                  | Page count + text extraction for checks     |
| Tests         | Vitest + Testing Library (jsdom) + Playwright Test          | Use `bun run test:unit`, not `bun test`     |

References:

- [SvelteKit adapter-bun](https://svelte.dev/docs/kit/adapter-bun)
- [Playwright page.pdf](https://playwright.dev/docs/api/class-page)
- [Zod objects](https://zod.dev/api)
- [remark-parse](https://github.com/remarkjs/remark/blob/main/packages/remark-parse/readme.md)

## Boundaries

```
src/lib/cv/           Canonical schema, hash, form/JSON/Markdown adapters, CvDocument
src/lib/quality/      Pure quality-check functions
src/lib/server/       Snapshots, PDF service, config (not imported by client UI)
src/routes/api/       HTTP adapters reusing lib modules
src/routes/print/     Print-only view for Playwright
```

No Hono, database, auth, or queue. SvelteKit `+server.ts` routes are the API surface. Core lib code avoids SvelteKit types so a separate worker could call the same modules later.

## Data flow

1. Form, JSON, or Markdown → adapters → `Cv` (Zod).
2. Editor holds draft state; content hash computed in the browser (Web Crypto SHA-256).
3. `POST /api/acceptance` stores an in-memory snapshot (id + hash + cv).
4. Edits change the hash → client clears acceptance.
5. `POST /api/pdf` loads snapshot, renders `/print/[id]` in Chromium, runs checks, stores PDF bytes in memory.
6. `GET /api/pdf/[id]` downloads when no blocking checks.

## SvelteKit 3 import paths

App code uses `#lib/...` subpath imports (not `$lib`), per [SvelteKit $lib migration](https://svelte.dev/docs/kit/$lib).

## Production build

Playwright, pdfjs-dist, and pdf-lib are SSR externals in `vite.config.ts` so the server bundle does not embed Playwright. Production hosts must install Chromium (`bunx playwright install chromium`) and keep `playwright` available in `node_modules`.

## Known MVP limits

- Snapshots and PDFs are in-memory (lost on restart).
- Single template id: `single-column-a4`.
- Quality checks do not prove ATS compatibility or perfect pagination.
