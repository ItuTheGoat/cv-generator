import { cleanup, render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';

import CvDocument from './CvDocument.svelte';
import { alexMorganFixture } from './fixture.js';

afterEach(() => {
	cleanup();
});

describe('CvDocument', () => {
	it('shows name, title, and a current role without end date', () => {
		render(CvDocument, { cv: alexMorganFixture });
		expect(screen.getByRole('heading', { level: 1, name: 'Alex Morgan' })).toBeTruthy();
		expect(screen.getByText(/Present/)).toBeTruthy();
		expect(screen.getAllByText('Senior Software Engineer').length).toBeGreaterThan(0);
	});

	it('omits blank dates and replaces the end date when a role is current', () => {
		const cv = structuredClone(alexMorganFixture);
		cv.experience[0].endDate = '2099-01';
		cv.experience[1].startDate = '-';
		cv.experience[1].endDate = null;
		cv.education[0].startDate = '';
		cv.education[0].endDate = '-';
		cv.certifications[0].date = '-';
		cv.basics.phone = '';
		cv.basics.title = null;

		const { container } = render(CvDocument, { cv });
		const text = container.textContent ?? '';

		expect(text).toContain('2021-03 – Present');
		expect(text).not.toContain('2099-01');
		expect(text).not.toContain('2017-06');
		expect(text).not.toContain('2013');
		expect(text).not.toContain('2023-09');
		expect(text).not.toContain('+1 555 0100');
		expect(screen.queryByText('Senior Software Engineer', { selector: '.cv-title' })).toBeNull();
	});

	it('paginates experience as per-entry blocks, not one section block', () => {
		const { container } = render(CvDocument, { cv: alexMorganFixture });
		const experience = [...container.querySelectorAll('.cv-section')].find(
			(section) => section.querySelector(':scope > .cv-section-title')?.textContent === 'Experience'
		);
		expect(experience).toBeTruthy();
		expect(experience!.hasAttribute('data-cv-block')).toBe(false);
		expect(experience!.querySelectorAll('.cv-entry[data-cv-block]').length).toBe(
			alexMorganFixture.experience.length
		);
	});
});
