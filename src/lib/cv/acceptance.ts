import { computeContentHash } from './hash.js';
import type { Cv } from './schema.js';
import { DEFAULT_TEMPLATE_ID } from './schema.js';

export type AcceptanceState = {
	snapshotId: string | null;
	contentHash: string | null;
	templateId: string;
};

export function createAcceptanceState(): AcceptanceState {
	return { snapshotId: null, contentHash: null, templateId: DEFAULT_TEMPLATE_ID };
}

export async function acceptanceMatchesCv(state: AcceptanceState, cv: Cv): Promise<boolean> {
	if (!state.snapshotId || !state.contentHash) return false;
	const hash = await computeContentHash(cv, state.templateId);
	return hash === state.contentHash;
}

export function clearAcceptance(state: AcceptanceState): AcceptanceState {
	return { ...state, snapshotId: null, contentHash: null };
}
