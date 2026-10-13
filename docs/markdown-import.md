# Markdown import convention

CV Forge imports Markdown structurally using **remark-parse** and **remark-gfm**. YAML frontmatter is parsed with **remark-frontmatter** and the **yaml** package (data only, no custom tags).

## Frontmatter

```yaml
---
schemaVersion: 1
basics:
  name: Alex Morgan
  title: Senior Software Engineer
  email: alex@example.com
  phone: '+1 555 0100'
  location: Denver, CO
  website: https://example.com
---
```

Supported `schemaVersion` is **1** only.

## Section headings (`##`)

| Heading                                   | Maps to               |
| ----------------------------------------- | --------------------- |
| Summary / Professional summary / Profile  | `summary`             |
| Experience / Work experience / Employment | `experience[]`        |
| Education                                 | `education[]`         |
| Skills                                    | `skills[]`            |
| Projects                                  | `projects[]`          |
| Certifications                            | `certifications[]`    |
| Languages                                 | `languages[]`         |
| Custom: Title                             | `customSections[]`    |
| Any other `##`                            | Unmapped review block |

## Entries inside sections

Use `###` headings for each entry in Experience, Education, Projects, and Certifications.

Optional labeled lines (plain text):

```
Role: Senior Engineer
Company: Example Co
Location: Remote
Start: 2021-03
End: 2024-01
Current: yes
```

Skills and languages use bullet lists. Language lines may use `Language — Fluency`.

## Safety and honesty

- HTML nodes are **not** rendered; they are reported in import warnings.
- Unmapped sections are returned for manual review; nothing is invented.
- Ambiguous content produces warnings, not silent drops (except stripped HTML).

Example file: [static/examples/alex-morgan.cv.md](../static/examples/alex-morgan.cv.md).
