import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { importMarkdown } from './markdown.js';

const examplesDir = path.join(
	path.dirname(fileURLToPath(import.meta.url)),
	'../../../static/examples'
);

describe('importMarkdown', () => {
	it('maps the documented Alex Morgan fixture', () => {
		const text = readFileSync(path.join(examplesDir, 'alex-morgan.cv.md'), 'utf8');
		const result = importMarkdown(text);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.cv.basics.name).toBe('Alex Morgan');
			expect(result.cv.experience.length).toBeGreaterThan(0);
		}
	});

	it('preserves unmapped sections and strips HTML warnings', () => {
		const md = `---
schemaVersion: 1
basics:
  name: Pat Example
---

## Summary

Hello

## Hobbies

Knitting

<p>script</p>
`;
		const result = importMarkdown(md);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.unmapped.some((u) => u.heading === 'Hobbies')).toBe(true);
			expect(result.warnings.some((w) => w.includes('HTML'))).toBe(true);
		}
	});
});
