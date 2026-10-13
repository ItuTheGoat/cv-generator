import { createEntryId } from '../cv/ids.js';
import { computeContentHash } from '../cv/hash.js';
import type { Cv } from '../cv/schema.js';
import { DEFAULT_TEMPLATE_ID } from '../cv/schema.js';
import type { QualityCheck } from '../quality/checks.js';

export type Snapshot = {
	id: string;
	cv: Cv;
	templateId: string;
	contentHash: string;
	acceptedAt: string;
};

export type PdfArtifact = {
	snapshotId: string;
	bytes: Uint8Array;
	pageCount: number;
	extractedText: string;
	generatedAt: string;
	checks: QualityCheck[];
};

const snapshots = new Map<string, Snapshot>();
const pdfs = new Map<string, PdfArtifact>();

export async function acceptSnapshot(cv: Cv, templateId = DEFAULT_TEMPLATE_ID): Promise<Snapshot> {
	const contentHash = await computeContentHash(cv, templateId);
	const snapshot: Snapshot = {
		id: createEntryId(),
		cv,
		templateId,
		contentHash,
		acceptedAt: new Date().toISOString()
	};
	snapshots.set(snapshot.id, snapshot);
	pdfs.delete(snapshot.id);
	return snapshot;
}

export function getSnapshot(id: string): Snapshot | undefined {
	return snapshots.get(id);
}

export function storePdf(artifact: PdfArtifact): void {
	pdfs.set(artifact.snapshotId, artifact);
}

export function getPdf(snapshotId: string): PdfArtifact | undefined {
	return pdfs.get(snapshotId);
}

/** Test helper */
export function clearStores(): void {
	snapshots.clear();
	pdfs.clear();
}
