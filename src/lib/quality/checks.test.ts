import { describe, expect, it } from 'vitest';

import { alexMorganFixture } from '../cv/fixture.js';
import { hasBlockingChecks, runPostPdfChecks, runPrePdfChecks } from './checks.js';

describe('quality checks', () => {
	it('blocks missing candidate name', () => {
		const cv = structuredClone(alexMorganFixture);
		cv.basics.name = '';
		const checks = runPrePdfChecks({
			cv,
			contentHash: 'a',
			acceptedHash: 'a',
			fontsReady: true,
			horizontalOverflow: false
		});
		expect(hasBlockingChecks(checks)).toBe(true);
	});

	it('warns on long sections without mutating CV', () => {
		const cv = structuredClone(alexMorganFixture);
		cv.summary = 'x'.repeat(2100);
		const before = structuredClone(cv);
		const checks = runPrePdfChecks({
			cv,
			contentHash: 'a',
			acceptedHash: 'a',
			fontsReady: true,
			horizontalOverflow: false
		});
		expect(checks.some((c) => c.severity === 'warning')).toBe(true);
		expect(cv).toEqual(before);
	});

	it('validates PDF bytes and extracted text', () => {
		const checks = runPostPdfChecks({
			pdfBytes: new TextEncoder().encode('%PDF-1.4 fake'),
			pageCount: 1,
			extractedText: 'Alex Morgan',
			expectedName: 'Alex Morgan',
			pageWarningLimit: 2
		});
		expect(checks.some((c) => c.id === 'pdf-parseable')).toBe(true);
	});
});
