import { CV_SCHEMA_VERSION, cvSchema, formatZodIssues } from './schema.js';
import type { Cv } from './schema.js';

export const MAX_IMPORT_BYTES = 256 * 1024;

export type JsonImportSuccess = {
	ok: true;
	cv: Cv;
};

export type JsonImportFailure = {
	ok: false;
	kind: 'syntax' | 'size' | 'version' | 'schema';
	messages: string[];
};

export type JsonImportResult = JsonImportSuccess | JsonImportFailure;

function byteLength(text: string): number {
	return new TextEncoder().encode(text).byteLength;
}

export function importJson(text: string): JsonImportResult {
	if (byteLength(text) > MAX_IMPORT_BYTES) {
		return {
			ok: false,
			kind: 'size',
			messages: [`Import exceeds ${MAX_IMPORT_BYTES} bytes.`]
		};
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(text);
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Invalid JSON syntax';
		return { ok: false, kind: 'syntax', messages: [message] };
	}

	if (typeof parsed !== 'object' || parsed === null) {
		return { ok: false, kind: 'schema', messages: ['Root value must be an object.'] };
	}

	const record = parsed as Record<string, unknown>;
	if (record.schemaVersion === undefined) {
		return {
			ok: false,
			kind: 'version',
			messages: [`Missing schemaVersion. Supported version is ${CV_SCHEMA_VERSION}.`]
		};
	}

	if (record.schemaVersion !== CV_SCHEMA_VERSION) {
		return {
			ok: false,
			kind: 'version',
			messages: [
				`Unsupported schemaVersion "${String(record.schemaVersion)}". Supported version is ${CV_SCHEMA_VERSION}.`
			]
		};
	}

	const result = cvSchema.safeParse(parsed);
	if (!result.success) {
		return { ok: false, kind: 'schema', messages: formatZodIssues(result.error) };
	}

	return { ok: true, cv: result.data };
}
