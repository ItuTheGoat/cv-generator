<script lang="ts">
	import { tick } from 'svelte';
	import CvDocument from '#lib/cv/CvDocument.svelte';
	import {
		CV_A4_CONTENT_HEIGHT_MM,
		computePageBreakOffsets,
		mmToPx
	} from '#lib/cv/page-breaks.js';
	import type { Cv } from '#lib/cv/schema.js';
	import '#lib/cv/cv.css';

	let { cv }: { cv: Cv } = $props();

	let measureHost = $state<HTMLDivElement | null>(null);
	let pageOffsets = $state<number[]>([0]);

	async function remeasure() {
		await tick();
		if (!measureHost) return;
		await document.fonts.ready;
		const root = measureHost.querySelector<HTMLElement>('[data-cv-root]');
		if (!root) {
			pageOffsets = [0];
			return;
		}
		const contentHeightPx = mmToPx(CV_A4_CONTENT_HEIGHT_MM, measureHost);
		pageOffsets = computePageBreakOffsets(root, contentHeightPx);
	}

	$effect(() => {
		cv;
		void remeasure();
	});
</script>

<div class="cv-preview-pages">
	<div class="cv-measure-host" bind:this={measureHost} aria-hidden="true">
		<div class="cv-a4-sheet cv-a4-sheet--measure">
			<CvDocument {cv} mode="screen" />
		</div>
	</div>

	{#each pageOffsets as start, index (index)}
		<div class="cv-a4-sheet" data-testid="cv-preview-page">
			<div class="cv-a4-sheet-clip">
				<div class="cv-a4-sheet-shift" style:transform="translateY(-{start}px)">
					<CvDocument {cv} mode="screen" />
				</div>
			</div>
		</div>
	{/each}
</div>

<style>
	.cv-preview-pages {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
	}

	.cv-measure-host {
		position: absolute;
		left: -10000px;
		top: 0;
		width: var(--cv-page-width);
		visibility: hidden;
		pointer-events: none;
	}

	.cv-a4-sheet {
		width: var(--cv-page-width);
		height: var(--cv-page-height);
		padding: var(--cv-page-margin);
		box-sizing: border-box;
		background: #fff;
		box-shadow: 0 2px 12px rgb(0 0 0 / 8%);
		flex-shrink: 0;
	}

	.cv-a4-sheet--measure {
		box-shadow: none;
	}

	.cv-a4-sheet-clip {
		height: calc(var(--cv-page-height) - 2 * var(--cv-page-margin));
		overflow: hidden;
	}

	.cv-a4-sheet-shift {
		will-change: transform;
	}
</style>
