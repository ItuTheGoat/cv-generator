import { json } from '@sveltejs/kit';

import { importJson } from '#lib/cv/json-import.js';

import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const text = await request.text();
	const result = importJson(text);
	if (!result.ok) {
		return json(result, { status: 400 });
	}
	return json(result);
};
