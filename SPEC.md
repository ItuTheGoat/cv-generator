# CV Forge — Initial Product Specification

**Status:** Initial draft
**Scope:** MVP / project foundation
**Language:** TypeScript
**Runtime and package manager:** Bun

## 1. Product vision

Build a local-first CV authoring and document-generation application.

Users can enter CV information manually, import Markdown, or import JSON. All inputs are converted into a single validated canonical CV model. Users can edit the result, preview the CV using a Svelte template, accept the final content, generate a PDF, and review document-quality checks before downloading it.

The application must prioritize correctness, predictable output, maintainability, and a good developer experience.

## 2. Core user workflow

1. **Input:** Start with a blank CV form, import a Markdown file, or import a JSON file.
2. **Parse:** Convert the input into the canonical CV data model.
3. **Validate:** Validate data at runtime and report actionable field-level errors.
4. **Review and edit:** Let the user correct imported information using a form.
5. **Preview:** Render the CV with the selected Svelte template.
6. **Accept:** The user explicitly accepts the content and design.
7. **Generate:** Generate the PDF only after acceptance.
8. **Inspect:** Run document-quality checks and display their results.
9. **Download:** Allow the user to download the PDF when generation succeeds and blocking checks pass.

Acceptance applies to a specific snapshot of the CV. If the user changes the content or layout afterward, invalidate the acceptance and require acceptance again.

## 3. Supported inputs

### 3.1 Form input

Provide an editable form for the canonical CV fields.

Users must be able to add, remove, and reorder repeatable sections such as employment history, education, projects, and skills.

### 3.2 JSON import

- Parse valid JSON.
- Validate the parsed value against the canonical schema.
- Report invalid JSON syntax separately from schema validation errors.
- Reject unsupported schema versions with a helpful message.
- Do not silently discard invalid or unrecognized data.
- Provide a downloadable example JSON document.

### 3.3 Markdown import

Define and document a predictable Markdown convention, preferably with YAML frontmatter and recognizable section headings.

Use a Markdown parser rather than regular expressions to process the document.

The importer must:

- Support the documented convention.
- Recognize common headings such as Summary, Experience, Education, Skills, and Projects.
- Report content it cannot confidently map.
- Preserve unmapped content for manual review.
- Never invent missing information.
- Allow the user to edit and validate the resulting CV before acceptance.

Do not attempt to perfectly interpret every arbitrary CV written in Markdown. Ambiguous imports must produce reviewable warnings.

Treat imported Markdown as untrusted input. Do not execute embedded HTML or scripts.

## 4. Canonical CV model

Use a versioned TypeScript model with a Zod runtime schema as the single source of truth.

Suggested top-level structure:

- `schemaVersion`
- `basics`

  - name
  - professional title
  - email
  - phone
  - location
  - website and professional links

- `summary`
- `experience[]`

  - company
  - role/title
  - location
  - start date
  - optional end date
  - current-role indicator
  - achievements

- `education[]`
- `skills[]`
- `projects[]`
- `certifications[]`
- `languages[]`
- `customSections[]`

Use optional fields where appropriate. A current role must not require an end date. Do not make optional personal details mandatory.

Keep dates structured and validate their format. Do not assume all CVs use the same date conventions.

Support stable IDs for repeatable entries so editing and reordering do not cause identity problems.

## 5. Rendering architecture

Svelte components are the canonical presentation templates.

The same template and shared design tokens should power both the interactive preview and the print view.

Implement:

- One clean, single-column, ATS-oriented A4 template.
- A dedicated print route that renders a specific accepted CV snapshot.
- Screen styles for the preview.
- Print styles using `@media print` and appropriate page-break rules.
- Explicit typography, spacing, margins, colour, and page-size tokens.
- A clear separation between CV data, presentation components, and PDF-generation logic.

Do not introduce a second template engine unless there is a demonstrated technical reason.

Never render imported HTML as trusted markup.

## 6. PDF generation

Use Playwright with Chromium to render the print route and generate the PDF.

Requirements:

- Use A4 as the default page size.
- Wait for the CV content, fonts, and required assets to finish loading.
- Use explicit print margins and CSS.
- Preserve text as selectable text rather than converting the entire CV into an image.
- Set PDF metadata where practical.
- Return useful errors when rendering fails.
- Close browser pages and release browser resources correctly.
- Do not generate or publish a PDF before user acceptance.

PDF generation should be isolated behind a small service interface so its implementation can be changed later.

## 7. Document-quality checks

Implement checks in distinct categories.

### Before PDF generation

- Canonical schema validation.
- Missing or suspicious dates.
- Empty or excessively long sections.
- Missing candidate name.
- Print-layout readiness.
- Content changes since acceptance.

### During rendering

- Fonts and required assets loaded.
- No unexpected horizontal overflow.
- No elements extending outside the printable page width.
- No unexpected blank pages.
- Page count within a configurable limit, with warnings rather than arbitrary content deletion.

### After PDF generation

- PDF exists, is non-empty, and is parseable.
- Page count is within configured limits.
- Expected candidate name and important content can be extracted.
- Extracted text is not unexpectedly empty.
- Report any checks that could not be completed.

Clearly distinguish errors, warnings, and informational results.

Do not claim that automated checks guarantee perfect pagination or universal ATS compatibility. Page-break and visual-regression checks should be improved iteratively.

The quality-check pipeline must be independently testable.

## 8. Suggested technical stack

- SvelteKit
- Svelte 5
- TypeScript with strict checking
- Bun runtime and package manager
- Official `@sveltejs/adapter-bun`, subject to documented runtime requirements
- Zod for validation and inferred types
- `unified`, `remark-parse`, and `remark-gfm` for Markdown parsing
- Playwright with Chromium for PDF generation and browser automation
- Vitest for unit and integration tests
- Svelte Testing Library for component tests
- Playwright Test for end-to-end tests

Use stable, mutually compatible versions at implementation time. Do not adopt prerelease framework versions without explicit justification.

Do not add Hono in the initial version unless a concrete architectural requirement demonstrates why SvelteKit's server endpoints are insufficient. Document the decision.

## 9. Application boundaries

Keep separate modules for:

- Input adapters: form, Markdown, JSON.
- Canonical model and validation.
- Markdown parsing and mapping.
- CV editing state.
- Presentation templates.
- Acceptance and snapshot management.
- PDF rendering.
- Document-quality checks.
- File download.

Use explicit interfaces at boundaries and avoid circular dependencies.

No database, user accounts, cloud storage, event bus, or external AI service is required for the MVP.

## 10. Security and privacy

- Treat all imported content as untrusted.
- Validate all imported data on the server as well as in the UI.
- Enforce reasonable input-size limits.
- Prevent arbitrary URLs or user-controlled content from causing server-side network requests during rendering.
- Avoid unrestricted file-system access from imported data.
- Do not log full CV contents or unnecessary personal information.
- Keep generated files in a controlled temporary location and clean them up appropriately.
- Document any remaining security limitations.

## 11. Testing requirements

### Unit tests

- Canonical schema validation.
- Markdown parsing and mapping.
- JSON parsing and validation.
- Acceptance snapshot invalidation.
- Quality-check logic.
- Page-count and rendering-result interpretation.

### Component tests

- Input selection.
- Validation errors.
- CV editing.
- Preview updates.
- Acceptance and invalidation states.
- PDF generation status and quality-check results.

### Integration and end-to-end tests

- Import a valid JSON fixture.
- Import a documented Markdown fixture.
- Reject malformed input.
- Edit and accept a CV.
- Generate a PDF.
- Verify PDF metadata, page count, and extracted text.
- Verify that editing after acceptance prevents generation from using a stale snapshot.
- Verify that failed quality checks prevent download when the failure is blocking.

Use deterministic fixtures and avoid depending on external services.

## 12. Initial UI

Create a simple, polished application with:

- An input/import screen.
- An editable CV form.
- A live document preview.
- An acceptance action.
- A PDF generation state.
- A document-quality report.
- A download action.

The application should have useful empty, loading, success, warning, and error states.

Use realistic sample data that is clearly marked as fictional.

## 13. Out of scope

Do not implement these in the initial scaffold:

- AI-written or job-tailored CV content.
- Authentication or multi-user support.
- Database persistence.
- Multiple export formats beyond the initial JSON and PDF workflows.
- XML export.
- A template marketplace.
- Distributed processing or background job infrastructure.
- Complex automated layout optimization.
- Claims of universal ATS compatibility.

## 14. Definition of done

The initial project is complete when:

1. A developer can install dependencies using Bun and follow the README to run the app.
2. The application builds using the documented production adapter.
3. A user can enter a CV through the form.
4. JSON and documented Markdown imports work and produce actionable errors for invalid input.
5. All inputs converge on the same validated CV model.
6. The preview uses a reusable Svelte template.
7. PDF generation requires acceptance of the current CV snapshot.
8. A generated PDF can be parsed and checked.
9. Blocking quality failures prevent download.
10. Unit, component, integration, and relevant end-to-end tests pass.
11. Type checking and linting pass.
12. No major architectural decisions or known limitations are hidden from the README.

Deliver a working, intentionally small foundation rather than an elaborate framework.
