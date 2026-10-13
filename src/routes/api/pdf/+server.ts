import { json, error } from '@sveltejs/kit';

import { getPageWarningLimit } from '#lib/server/config.js';
import { renderSnapshotPdf } from '#lib/server/pdf.js';
import { getSnapshot, storePdf } from '#lib/server/snapshots.js';
import { hasBlockingChecks, runPostPdfChecks, runPrePdfChecks } from '#lib/quality/checks.js';

import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, url }) => {
	let body: { snapshotId?: string; contentHash?: string };
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON body');
	}

	const snapshotId = body.snapshotId?.trim();
	const contentHash = body.contentHash?.trim();
	if (!snapshotId || !contentHash) {
		throw error(400, 'snapshotId and contentHash are required');
	}

	const snapshot = getSnapshot(snapshotId);
	if (!snapshot) {
		throw error(404, 'Accepted snapshot not found');
	}

	if (snapshot.contentHash !== contentHash) {
		return json(
			{
				ok: false,
				message: 'Content hash does not match the accepted snapshot.',
				checks: runPrePdfChecks({
					cv: snapshot.cv,
					contentHash,
					acceptedHash: snapshot.contentHash,
					fontsReady: false,
					horizontalOverflow: false
				})
			},
			{ status: 409 }
		);
	}

	const rendered = await renderSnapshotPdf(snapshot, `${url.protocol}//${url.host}`);

	if (!rendered.ok) {
		return json({ ok: false, message: rendered.message, checks: [] }, { status: 500 });
	}

	const preChecks = runPrePdfChecks({
		cv: snapshot.cv,
		contentHash,
		acceptedHash: snapshot.contentHash,
		fontsReady: rendered.fontsReady,
		horizontalOverflow: rendered.horizontalOverflow
	});

	const postChecks = runPostPdfChecks({
		pdfBytes: rendered.bytes,
		pageCount: rendered.pageCount,
		extractedText: rendered.extractedText,
		expectedName: snapshot.cv.basics.name,
		pageWarningLimit: getPageWarningLimit()
	});

	const checks = [...preChecks, ...postChecks];
	const blocking = hasBlockingChecks(checks);

	storePdf({
		snapshotId,
		bytes: rendered.bytes,
		pageCount: rendered.pageCount,
		extractedText: rendered.extractedText,
		generatedAt: new Date().toISOString(),
		checks
	});

	return json({
		ok: !blocking,
		snapshotId,
		pageCount: rendered.pageCount,
		checks,
		downloadAllowed: !blocking
	});
};
