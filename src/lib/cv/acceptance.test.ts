import { describe, expect, it } from 'vitest';

import { acceptanceMatchesCv, clearAcceptance, createAcceptanceState } from './acceptance.js';
import { alexMorganFixture } from './fixture.js';
import { computeContentHash } from './hash.js';

describe('acceptance invalidation', () => {
	it('clears when CV content no longer matches hash', async () => {
		const hash = await computeContentHash(alexMorganFixture);
		const state = { ...createAcceptanceState(), snapshotId: 'snap-1', contentHash: hash };
		expect(await acceptanceMatchesCv(state, alexMorganFixture)).toBe(true);

		const edited = structuredClone(alexMorganFixture);
		edited.summary = 'Updated summary';
		expect(await acceptanceMatchesCv(state, edited)).toBe(false);
	});

	it('clearAcceptance removes snapshot metadata', () => {
		const cleared = clearAcceptance({
			snapshotId: 'x',
			contentHash: 'y',
			templateId: 'single-column-a4'
		});
		expect(cleared.snapshotId).toBeNull();
		expect(cleared.contentHash).toBeNull();
	});
});
