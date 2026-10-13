# CV Forge

Local-first CV authoring and PDF export built with SvelteKit, Svelte 5, TypeScript, and Bun.

Licensed under the [Apache License 2.0](LICENSE).

Enter CV data through a form, import JSON or Markdown, preview a single-column A4 template, accept a snapshot, generate a PDF with Playwright/Chromium, review quality checks, and download when blocking checks pass.

## Requirements

- [Bun](https://bun.sh/) **1.4+** (runtime and package manager)
- Chromium for Playwright (installed via the scripts below)

## Setup

```sh
bun install
bunx playwright install chromium
```

Copy optional environment variables from [`.env.example`](.env.example) if needed.

## Commands

| Command             | Purpose                                           |
| ------------------- | ------------------------------------------------- |
| `bun run dev`       | Start the development server                      |
| `bun run build`     | Production build with `@sveltejs/adapter-bun`     |
| `bun run start`     | Run the production server (`bun ./build`)         |
| `bun run check`     | SvelteKit sync + TypeScript checking              |
| `bun run lint`      | Prettier + ESLint                                 |
| `bun run test:unit` | Vitest unit, component, and PDF integration tests |
| `bun run test:e2e`  | Playwright end-to-end tests                       |

Use `bun run test:unit`, not `bun test` (Bun’s native test runner is not configured for this project).

## Verification (foundation)

After `bun install` and `bunx playwright install chromium`, these commands were run successfully on the foundation build:

- `bun run check` — 0 errors
- `bun run lint` — Prettier + ESLint clean
- `bun run test:unit` — 17 Vitest tests (schema, imports, acceptance, quality, component, PDF integration)
- `bun run test:e2e` — 5 Playwright tests (editor smoke + accept → PDF → download via HTTP API, malformed JSON, stale snapshot, JSON import API)
- `bun run build` — production build with `@sveltejs/adapter-bun`

End-to-end coverage uses the API for accept/PDF/download because it exercises the same server path the UI calls; extend with full browser form flows when needed.

## Architecture overview

- **Input adapters:** form, JSON, Markdown → one Zod-validated CV model
- **Presentation:** shared `CvDocument` Svelte component + CSS tokens for screen and print
- **Acceptance:** in-memory snapshot + content hash (lost on server restart)
- **PDF:** headless Chromium renders `/print/[id]`; metadata applied with `pdf-lib`
- **Quality checks:** deterministic and heuristic checks before/after PDF generation

See [docs/architecture.md](docs/architecture.md), [docs/markdown-import.md](docs/markdown-import.md), and [docs/pdf-quality.md](docs/pdf-quality.md).

## Example data

Fictional fixtures (not real people):

- [static/examples/alex-morgan.cv.json](static/examples/alex-morgan.cv.json)
- [static/examples/alex-morgan.cv.md](static/examples/alex-morgan.cv.md)

## Troubleshooting

- **PDF generation fails immediately:** Run `bunx playwright install chromium`.
- **Print layout never ready:** Ensure the dev/production server is reachable at the URL Playwright uses (`ORIGIN` env var if needed).
- **Acceptance cleared after edits:** Expected — acceptance is tied to a specific CV hash.
- **Download returns 422:** Fix blocking items in the quality report and regenerate the PDF.

## Product spec

[SPEC.md](SPEC.md) remains the product requirements document for this repository.
