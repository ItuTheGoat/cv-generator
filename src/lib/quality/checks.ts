import { isCalendarDate } from '../cv/format.js';
import type { Cv } from '../cv/schema.js';
import { cvSchema } from '../cv/schema.js';

export type CheckSeverity = 'error' | 'warning' | 'info';

export type QualityCheck = {
	id: string;
	severity: CheckSeverity;
	message: string;
	/** true when the result is heuristic rather than strictly deterministic */
	heuristic?: boolean;
};

export type PrePdfInput = {
	cv: Cv;
	contentHash: string;
	acceptedHash: string | null;
	fontsReady: boolean;
	horizontalOverflow: boolean;
};

export type PostPdfInput = {
	pdfBytes: Uint8Array | null;
	pageCount: number | null;
	extractedText: string;
	expectedName: string | null | undefined;
	pageWarningLimit: number;
};

const LONG_SECTION_CHARS = 2000;

function parseDateParts(value: string): { y: number; m: number; d: number } {
	const [y, m = '01', d = '01'] = value.split('-');
	return { y: Number(y), m: Number(m), d: Number(d) };
}

function compareDates(a: string, b: string): number {
	const da = parseDateParts(a);
	const db = parseDateParts(b);
	if (da.y !== db.y) return da.y - db.y;
	if (da.m !== db.m) return da.m - db.m;
	return da.d - db.d;
}

export function runPrePdfChecks(input: PrePdfInput): QualityCheck[] {
	const checks: QualityCheck[] = [];
	const parsed = cvSchema.safeParse(input.cv);
	if (!parsed.success) {
		checks.push({
			id: 'schema-valid',
			severity: 'error',
			message: 'CV data failed canonical schema validation.'
		});
	} else {
		checks.push({ id: 'schema-valid', severity: 'info', message: 'Canonical schema is valid.' });
	}

	const name = input.cv.basics.name?.trim();
	if (!name) {
		checks.push({
			id: 'candidate-name',
			severity: 'error',
			message: 'Candidate name is missing.'
		});
	}

	if (input.acceptedHash && input.contentHash !== input.acceptedHash) {
		checks.push({
			id: 'acceptance-stale',
			severity: 'error',
			message: 'Content changed since acceptance; accept again before generating a PDF.'
		});
	}

	if (!input.fontsReady) {
		checks.push({
			id: 'fonts-ready',
			severity: 'error',
			message: 'Fonts were not ready on the print layout.'
		});
	}

	if (input.horizontalOverflow) {
		checks.push({
			id: 'horizontal-overflow',
			severity: 'error',
			message: 'Print layout overflows horizontally.',
			heuristic: true
		});
	}

	for (const job of input.cv.experience) {
		if (
			isCalendarDate(job.endDate) &&
			isCalendarDate(job.startDate) &&
			compareDates(job.endDate, job.startDate) < 0
		) {
			checks.push({
				id: `date-order-${job.id}`,
				severity: 'warning',
				message: `Experience "${job.role}" has end date before start date.`
			});
		}
		if (job.current && isCalendarDate(job.endDate)) {
			checks.push({
				id: `current-end-${job.id}`,
				severity: 'warning',
				message: `Experience "${job.role}" is marked current but has an end date.`
			});
		}
	}

	const sections: { label: string; text: string }[] = [
		{ label: 'Summary', text: input.cv.summary ?? '' },
		...input.cv.customSections.map((s) => ({ label: s.title, text: s.content.join('\n') }))
	];
	for (const section of sections) {
		if (section.text.length > LONG_SECTION_CHARS) {
			checks.push({
				id: `long-${section.label}`,
				severity: 'warning',
				message: `Section "${section.label}" is longer than ${LONG_SECTION_CHARS} characters.`
			});
		}
	}

	return checks;
}

export function runPostPdfChecks(input: PostPdfInput): QualityCheck[] {
	const checks: QualityCheck[] = [];

	if (!input.pdfBytes || input.pdfBytes.byteLength === 0) {
		checks.push({ id: 'pdf-nonempty', severity: 'error', message: 'PDF is missing or empty.' });
		return checks;
	}

	const header = new TextDecoder().decode(input.pdfBytes.slice(0, 5));
	if (header !== '%PDF-') {
		checks.push({
			id: 'pdf-parseable',
			severity: 'error',
			message: 'PDF bytes do not look like a PDF file.'
		});
	} else {
		checks.push({ id: 'pdf-parseable', severity: 'info', message: 'PDF header is valid.' });
	}

	if (input.pageCount === null) {
		checks.push({
			id: 'page-count',
			severity: 'warning',
			message: 'Page count could not be determined.',
			heuristic: true
		});
	} else {
		checks.push({
			id: 'page-count',
			severity: 'info',
			message: `PDF has ${input.pageCount} page(s).`
		});
		if (input.pageCount > input.pageWarningLimit) {
			checks.push({
				id: 'page-limit',
				severity: 'warning',
				message: `Page count exceeds configured warning limit (${input.pageWarningLimit}).`
			});
		}
	}

	const text = input.extractedText.trim();
	if (!text) {
		checks.push({
			id: 'extracted-text',
			severity: 'error',
			message: 'No text could be extracted from the PDF.'
		});
	} else if (
		input.expectedName?.trim() &&
		!text.toLowerCase().includes(input.expectedName.trim().toLowerCase())
	) {
		checks.push({
			id: 'expected-name',
			severity: 'error',
			message: 'Extracted PDF text does not include the candidate name.'
		});
	}

	return checks;
}

export function hasBlockingChecks(checks: QualityCheck[]): boolean {
	return checks.some((c) => c.severity === 'error');
}
