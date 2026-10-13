import { json } from '@sveltejs/kit';

import { importMarkdown } from '#lib/cv/markdown.js';

import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const text = await request.text();
	const result = importMarkdown(text);
	if (!result.ok) {
		return json(result, { status: 400 });
	}
	return json(result);
};
