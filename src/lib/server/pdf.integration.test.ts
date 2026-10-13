import { spawn, type ChildProcess } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';

import { alexMorganFixture } from '../cv/fixture.js';
import { renderSnapshotPdf } from './pdf.js';
import type { Snapshot } from './snapshots.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const port = 3456;
const origin = `http://127.0.0.1:${port}`;

let devServer: ChildProcess | null = null;

async function waitForServer(url: string, attempts = 60): Promise<void> {
	for (let i = 0; i < attempts; i += 1) {
		try {
			const res = await fetch(url);
			if (res.ok || res.status < 500) return;
		} catch {
			// retry
		}
		await new Promise((r) => setTimeout(r, 500));
	}
	throw new Error('Dev server did not start');
}

async function acceptOnServer(): Promise<Snapshot> {
	const res = await fetch(`${origin}/api/acceptance`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ cv: alexMorganFixture })
	});
	if (!res.ok) throw new Error(`Acceptance failed: ${res.status}`);
	const data = (await res.json()) as {
		snapshotId: string;
		contentHash: string;
		templateId: string;
		acceptedAt: string;
	};
	return {
		id: data.snapshotId,
		cv: alexMorganFixture,
		templateId: data.templateId,
		contentHash: data.contentHash,
		acceptedAt: data.acceptedAt
	};
}

describe('PDF generation integration', () => {
	beforeAll(async () => {
		devServer = spawn('bun', ['run', 'dev', '--', '--port', String(port), '--host', '127.0.0.1'], {
			cwd: root,
			stdio: 'ignore'
		});
		await waitForServer(origin);
	}, 120_000);

	afterAll(async () => {
		devServer?.kill('SIGTERM');
	});

	it('renders Alex Morgan fixture to a non-empty PDF with name text', async () => {
		const snapshot = await acceptOnServer();
		const result = await renderSnapshotPdf(snapshot, origin);
		if (!result.ok) {
			throw new Error(result.message);
		}
		expect(result.ok).toBe(true);
		if (result.ok) {
			const header = new TextDecoder().decode(result.bytes.slice(0, 5));
			expect(header).toBe('%PDF-');
			expect(result.pageCount).toBeGreaterThan(0);
			expect(result.extractedText.toLowerCase()).toContain('alex morgan');
		}
	}, 120_000);
});
