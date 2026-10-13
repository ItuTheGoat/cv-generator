import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';

import { computePageBreakOffsets } from './page-breaks.js';

type Rect = { top: number; height: number };

function mockRects(root: HTMLElement, rects: Map<HTMLElement, Rect>): void {
	const rootRect = rects.get(root) ?? { top: 0, height: 0 };
	for (const [el, rect] of rects) {
		el.getBoundingClientRect = () =>
			({
				top: rootRect.top + rect.top,
				height: rect.height,
				bottom: rootRect.top + rect.top + rect.height,
				left: 0,
				right: 0,
				width: 100,
				x: 0,
				y: rootRect.top + rect.top,
				toJSON: () => ({})
			}) as DOMRect;
	}
}

describe('computePageBreakOffsets', () => {
	it('breaks before a second block when the first block leaves no room on the page', () => {
		const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
		const { document } = dom.window;
		const root = document.createElement('article');
		root.setAttribute('data-cv-root', '');
		const header = document.createElement('header');
		header.setAttribute('data-cv-block', '');
		const entry = document.createElement('div');
		entry.setAttribute('data-cv-block', '');
		root.append(header, entry);
		document.body.append(root);

		const rects = new Map<HTMLElement, Rect>([
			[root, { top: 0, height: 400 }],
			[header, { top: 0, height: 100 }],
			[entry, { top: 100, height: 50 }]
		]);
		mockRects(root, rects);

		const breaks = computePageBreakOffsets(root, 120);
		expect(breaks).toEqual([0, 100]);
	});

	it('breaks at the section heading when the heading and first entry do not fit together', () => {
		const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
		const { document } = dom.window;
		const root = document.createElement('article');
		root.setAttribute('data-cv-root', '');
		const header = document.createElement('header');
		header.setAttribute('data-cv-block', '');
		const section = document.createElement('section');
		const heading = document.createElement('h2');
		const entry = document.createElement('div');
		entry.setAttribute('data-cv-block', '');
		section.append(heading, entry);
		root.append(header, section);
		document.body.append(root);

		const rects = new Map<HTMLElement, Rect>([
			[root, { top: 0, height: 500 }],
			[header, { top: 0, height: 80 }],
			[heading, { top: 80, height: 20 }],
			[entry, { top: 100, height: 60 }]
		]);
		mockRects(root, rects);

		const breaks = computePageBreakOffsets(root, 120);
		expect(breaks).toEqual([0, 80]);
	});
});
