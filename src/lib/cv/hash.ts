import type { Cv } from './schema.js';
import { DEFAULT_TEMPLATE_ID } from './schema.js';

function toHex(buffer: ArrayBuffer): string {
	return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function computeContentHash(
	cv: Cv,
	templateId: string = DEFAULT_TEMPLATE_ID
): Promise<string> {
	const payload = JSON.stringify({ cv, templateId });
	const data = new TextEncoder().encode(payload);
	const digest = await crypto.subtle.digest('SHA-256', data);
	return toHex(digest);
}
