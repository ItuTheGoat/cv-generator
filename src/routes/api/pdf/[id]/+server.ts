import { error } from '@sveltejs/kit';

import { hasBlockingChecks } from '#lib/quality/checks.js';
import { getPdf } from '#lib/server/snapshots.js';

import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const artifact = getPdf(params.id);
	if (!artifact) {
		throw error(404, 'PDF not found. Generate a PDF first.');
	}

	if (hasBlockingChecks(artifact.checks)) {
		throw error(422, 'Blocking quality checks prevent download.');
	}

	return new Response(Buffer.from(artifact.bytes), {
		headers: {
			'Content-Type': 'application/pdf',
			'Content-Disposition': `attachment; filename="cv-${params.id}.pdf"`
		}
	});
};
