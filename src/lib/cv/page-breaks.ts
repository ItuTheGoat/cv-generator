/** Content area height inside A4 with 12mm margins (297mm − 24mm). */
export const CV_A4_CONTENT_HEIGHT_MM = 273;

export function mmToPx(mm: number, element: HTMLElement): number {
	const probe = element.ownerDocument.createElement('div');
	probe.style.height = `${mm}mm`;
	probe.style.position = 'absolute';
	probe.style.visibility = 'hidden';
	probe.style.pointerEvents = 'none';
	element.ownerDocument.body.appendChild(probe);
	const px = probe.offsetHeight;
	probe.remove();
	return px;
}

/** Top of a block plus any non-block siblings immediately above it (e.g. section title). */
export function packTopForBlock(block: HTMLElement, rootTop: number): number {
	const blockTop = block.getBoundingClientRect().top - rootTop;
	let packTop = blockTop;
	let sibling = block.previousElementSibling;
	while (sibling && !sibling.hasAttribute('data-cv-block')) {
		packTop = sibling.getBoundingClientRect().top - rootTop;
		sibling = sibling.previousElementSibling;
	}
	return packTop;
}

/**
 * Pack `[data-cv-block]` children into page offsets (px from document top).
 * Mirrors break-before behavior for blocks that use `break-inside: avoid`.
 */
export function computePageBreakOffsets(root: HTMLElement, contentHeightPx: number): number[] {
	const blocks = [...root.querySelectorAll<HTMLElement>('[data-cv-block]')];
	if (!blocks.length) return [0];

	const rootTop = root.getBoundingClientRect().top;
	const breaks: number[] = [0];
	let pageStart = 0;

	for (const block of blocks) {
		const rect = block.getBoundingClientRect();
		const blockTop = rect.top - rootTop;
		const packTop = packTopForBlock(block, rootTop);
		const blockHeight = rect.height;
		const blockBottom = blockTop + blockHeight;
		const packHeight = blockBottom - packTop;

		if (blockHeight > contentHeightPx) {
			if (blockTop > pageStart) {
				if (!breaks.includes(blockTop)) breaks.push(blockTop);
				pageStart = blockTop;
			}
			let sliceStart = pageStart;
			while (sliceStart + contentHeightPx < blockBottom) {
				sliceStart += contentHeightPx;
				if (!breaks.includes(sliceStart)) breaks.push(sliceStart);
			}
			pageStart = blockBottom;
			continue;
		}

		const usedOnPage = packTop - pageStart;
		if (usedOnPage + packHeight > contentHeightPx && packTop > pageStart) {
			if (!breaks.includes(packTop)) breaks.push(packTop);
			pageStart = packTop;
		}
	}

	breaks.sort((a, b) => a - b);
	return breaks;
}
