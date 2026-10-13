import { describe, expect, it } from 'vitest';

import { alexMorganFixture } from './fixture.js';
import { importJson } from './json-import.js';

describe('importJson', () => {
	it('imports valid JSON', () => {
		const result = importJson(JSON.stringify(alexMorganFixture));
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.cv.basics.name).toBe('Alex Morgan');
		}
	});

	it('reports syntax errors separately from schema errors', () => {
		const syntax = importJson('{ invalid');
		expect(syntax.ok).toBe(false);
		if (!syntax.ok) expect(syntax.kind).toBe('syntax');

		const schema = importJson(JSON.stringify({ schemaVersion: 1 }));
		expect(schema.ok).toBe(false);
		if (!schema.ok) expect(schema.kind).toBe('schema');
	});

	it('rejects unsupported schema versions', () => {
		const result = importJson(JSON.stringify({ ...alexMorganFixture, schemaVersion: 2 }));
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.kind).toBe('version');
	});
});
