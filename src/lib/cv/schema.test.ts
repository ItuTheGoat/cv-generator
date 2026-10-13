import { describe, expect, it } from 'vitest';

import { alexMorganFixture } from './fixture.js';
import { cvSchema } from './schema.js';

describe('cvSchema', () => {
	it('accepts the Alex Morgan fixture', () => {
		const result = cvSchema.safeParse(alexMorganFixture);
		expect(result.success).toBe(true);
	});

	it('rejects an invalid date', () => {
		const bad = structuredClone(alexMorganFixture);
		bad.experience[0].startDate = 'March 2021';
		const result = cvSchema.safeParse(bad);
		expect(result.success).toBe(false);
	});

	it('accepts omitted dates and blank optional fields', () => {
		const cv = structuredClone(alexMorganFixture);
		cv.experience[0].startDate = '-';
		cv.experience[0].endDate = null;
		cv.experience[1].startDate = null;
		cv.experience[1].endDate = '';
		cv.education[0].startDate = '-';
		cv.education[0].endDate = null;
		cv.projects[0].startDate = '';
		cv.projects[0].endDate = '-';
		cv.certifications[0].date = null;
		cv.basics.title = null;
		cv.basics.phone = '';
		cv.basics.website = null;
		cv.summary = '';
		cv.experience[0].location = null;
		cv.skills[0].level = null;
		const result = cvSchema.safeParse(cv);
		expect(result.success).toBe(true);
	});

	it('rejects unknown top-level keys', () => {
		const bad = { ...alexMorganFixture, extra: true };
		const result = cvSchema.safeParse(bad);
		expect(result.success).toBe(false);
	});

	it('rejects unsupported schema versions', () => {
		const bad = { ...alexMorganFixture, schemaVersion: 99 };
		const result = cvSchema.safeParse(bad);
		expect(result.success).toBe(false);
	});
});
