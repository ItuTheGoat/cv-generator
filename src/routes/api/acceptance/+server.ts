import { json, error } from '@sveltejs/kit';

import { cvSchema } from '#lib/cv/schema.js';
import { acceptSnapshot } from '#lib/server/snapshots.js';

import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON body');
	}

	const record = body as { cv?: unknown; templateId?: string };
	const parsed = cvSchema.safeParse(record.cv);
	if (!parsed.success) {
		return json({ ok: false, messages: ['CV failed schema validation.'] }, { status: 400 });
	}

	const snapshot = await acceptSnapshot(parsed.data, record.templateId);
	return json({
		ok: true,
		snapshotId: snapshot.id,
		contentHash: snapshot.contentHash,
		templateId: snapshot.templateId,
		acceptedAt: snapshot.acceptedAt
	});
};
