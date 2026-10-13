# PDF quality checks

Checks run around PDF generation and are implemented in `#lib/quality/checks.ts`. Results are **error** (blocking), **warning**, or **info**.

## Before / during render (pre-PDF)

| Check                             | Severity     | Deterministic?                           |
| --------------------------------- | ------------ | ---------------------------------------- |
| Canonical schema valid            | error / info | Yes                                      |
| Candidate name present            | error        | Yes                                      |
| Content hash matches acceptance   | error        | Yes                                      |
| Fonts ready on print page         | error        | Mostly (waits on `document.fonts.ready`) |
| Horizontal overflow on print root | error        | Heuristic (scroll vs client width)       |
| Date order / current + end date   | warning      | Yes                                      |
| Section length > 2000 chars       | warning      | Yes                                      |

## After PDF

| Check                        | Severity     | Deterministic?                                 |
| ---------------------------- | ------------ | ---------------------------------------------- |
| PDF non-empty                | error        | Yes                                            |
| PDF header `%PDF-`           | info / error | Yes                                            |
| Page count                   | info         | Yes (pdfjs)                                    |
| Page count above limit       | warning      | Yes (default limit 2, `CV_PAGE_WARNING_LIMIT`) |
| Extracted text non-empty     | error        | Yes                                            |
| Extracted text contains name | error        | Yes (case-insensitive substring)               |

## What we do not do

- Auto-shrink fonts or delete content to fit pages.
- Claim ATS compatibility or perfect page breaks.
- Guarantee blank-page detection (only empty extracted text per page is partially inferred via post checks).

## Troubleshooting

- **Fonts not ready:** Confirm `@fontsource` fonts load on `/print/[id]`; avoid third-party font CDNs in print layout.
- **Overflow error:** Shorten lines or reduce padding in `cv.css`; preview uses the same template as print.
- **Download 422:** Fix blocking errors in the UI report and regenerate the PDF.
- **Chromium missing:** Run `bunx playwright install chromium`.
