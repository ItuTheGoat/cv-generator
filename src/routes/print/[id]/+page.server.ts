import { error } from '@sveltejs/kit';

import { getSnapshot } from '#lib/server/snapshots.js';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params }) => {
	const snapshot = getSnapshot(params.id);
	if (!snapshot) {
		throw error(404, 'Snapshot not found');
	}
	return { cv: snapshot.cv, templateId: snapshot.templateId };
};
