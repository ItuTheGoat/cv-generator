import type { CvExperience } from './schema.js';

/** YYYY, YYYY-MM, or YYYY-MM-DD. */
export const CV_DATE_PATTERN = /^\d{4}(-\d{2}(-\d{2})?)?$/;

export function isCalendarDate(value: string | null | undefined): value is string {
	return typeof value === 'string' && CV_DATE_PATTERN.test(value);
}

/** `-`, blank, and null mean the author left the date off the CV. */
export function isOmittedDate(value: string | null | undefined): boolean {
	return value == null || value === '' || value === '-';
}

export function visibleText(value: string | null | undefined): string {
	return value?.trim() ?? '';
}

export function visibleLines(values: readonly (string | null | undefined)[]): string[] {
	return values.map((value) => value?.trim() ?? '').filter((value) => value.length > 0);
}

export function formatDateRange(
	start?: string | null,
	end?: string | null,
	current?: boolean
): string {
	const startLabel = isOmittedDate(start) ? '' : start;
	const endLabel = current ? 'Present' : isOmittedDate(end) ? '' : end;
	if (startLabel && endLabel) return `${startLabel} – ${endLabel}`;
	return startLabel || endLabel || '';
}

export function formatExperienceDates(job: CvExperience): string {
	return formatDateRange(job.startDate, job.endDate, job.current);
}

export function formatOptionalRange(start?: string | null, end?: string | null): string {
	return formatDateRange(start, end);
}
