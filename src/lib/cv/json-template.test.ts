import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { importJson } from './json-import.js';
import { cvJsonTemplate } from './json-template.js';
import { cvSchema } from './schema.js';

const templatePath = path.join(
	path.dirname(fileURLToPath(import.meta.url)),
	'../../../static/examples/cv.template.json'
);

describe('cv JSON template', () => {
	it('matches the downloadable template and passes import validation', () => {
		const text = readFileSync(templatePath, 'utf8');
		expect(JSON.parse(text)).toEqual(cvJsonTemplate);
		expect(cvSchema.parse(cvJsonTemplate)).toEqual(cvJsonTemplate);

		const result = importJson(text);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.cv.basics.name).toBe('Your Name');
		}
	});
});
