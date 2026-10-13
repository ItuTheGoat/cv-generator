import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';

import QualityReport from './QualityReport.svelte';

describe('QualityReport', () => {
	it('disables download when blocking checks exist', () => {
		render(QualityReport, {
			checks: [{ id: 'candidate-name', severity: 'error', message: 'Missing name' }],
			downloadSnapshotId: 'test',
			downloadAllowed: true
		});
		expect(screen.getByText(/Download blocked/)).toBeTruthy();
		expect(screen.queryByRole('link', { name: /Download PDF/i })).toBeNull();
	});
});
