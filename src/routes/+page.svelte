<script lang="ts">
	import CvDocumentPreview from '#lib/components/CvDocumentPreview.svelte';
	import JsonImportValidator from '#lib/components/JsonImportValidator.svelte';
	import QualityReport from '#lib/components/QualityReport.svelte';
	import { computeContentHash } from '#lib/cv/hash.js';
	import { createEmptyDraft, draftToCanonical } from '#lib/cv/form.js';
	import { importJson } from '#lib/cv/json-import.js';
	import { importMarkdown } from '#lib/cv/markdown.js';
	import { DEFAULT_TEMPLATE_ID } from '#lib/cv/schema.js';
	import type { Cv } from '#lib/cv/schema.js';
	import type { QualityCheck } from '#lib/quality/checks.js';
	import type { UnmappedBlock } from '#lib/cv/markdown.js';

	let cv = $state<Cv>(createEmptyDraft());
	let acceptance = $state<{ snapshotId: string | null; contentHash: string | null }>({
		snapshotId: null,
		contentHash: null
	});
	let liveHash = $state<string | null>(null);
	let status = $state<string | null>(null);
	let errorMessage = $state<string | null>(null);
	let importWarnings = $state<string[]>([]);
	let unmapped = $state<UnmappedBlock[]>([]);
	let checks = $state<QualityCheck[]>([]);
	let downloadAllowed = $state(false);
	let busy = $state<'accept' | 'pdf' | 'import' | null>(null);

	function clearAcceptanceState(message?: string) {
		acceptance = { snapshotId: null, contentHash: null };
		checks = [];
		downloadAllowed = false;
		if (message) status = message;
	}

	async function refreshLiveHash() {
		liveHash = await computeContentHash(cv, DEFAULT_TEMPLATE_ID);
	}

	async function loadSample() {
		errorMessage = null;
		try {
			const res = await fetch('/examples/alex-morgan.cv.json');
			if (!res.ok) throw new Error('Could not load sample CV');
			const result = importJson(await res.text());
			if (!result.ok) throw new Error(result.messages.join('\n'));
			cv = result.cv;
			clearAcceptanceState('Loaded fictional sample CV (Alex Morgan).');
			await refreshLiveHash();
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Could not load sample CV';
		}
	}

	async function acceptCv() {
		busy = 'accept';
		errorMessage = null;
		status = null;
		try {
			const body = { cv: draftToCanonical(cv), templateId: DEFAULT_TEMPLATE_ID };
			const res = await fetch('/api/acceptance', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});
			const data = await res.json();
			if (!res.ok || !data.ok) {
				throw new Error(data.messages?.join(' ') ?? 'Acceptance failed');
			}
			acceptance = { snapshotId: data.snapshotId, contentHash: data.contentHash };
			status = 'CV accepted for PDF generation.';
			checks = [];
			downloadAllowed = false;
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Acceptance failed';
		} finally {
			busy = null;
		}
	}

	async function generatePdf() {
		if (!acceptance.snapshotId || !acceptance.contentHash) {
			errorMessage = 'Accept the current CV before generating a PDF.';
			return;
		}
		busy = 'pdf';
		errorMessage = null;
		status = 'Generating PDF…';
		try {
			const res = await fetch('/api/pdf', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					snapshotId: acceptance.snapshotId,
					contentHash: acceptance.contentHash
				})
			});
			const data = await res.json();
			checks = data.checks ?? [];
			downloadAllowed = Boolean(data.downloadAllowed);
			if (!res.ok) {
				throw new Error(data.message ?? 'PDF generation failed');
			}
			status = data.downloadAllowed
				? 'PDF generated. Review checks before download.'
				: 'PDF generated with blocking quality issues.';
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'PDF generation failed';
		} finally {
			busy = null;
		}
	}

	async function renderValidatedJson(next: Cv) {
		errorMessage = null;
		importWarnings = [];
		unmapped = [];
		cv = next;
		clearAcceptanceState('Rendered validated JSON CV.');
		await refreshLiveHash();
	}

	async function importMarkdownFile(file: File) {
		busy = 'import';
		errorMessage = null;
		try {
			const result = importMarkdown(await file.text());
			if (!result.ok) {
				throw new Error(result.messages.join('\n'));
			}
			cv = result.cv;
			importWarnings = result.warnings ?? [];
			unmapped = result.unmapped ?? [];
			clearAcceptanceState('Imported Markdown CV.');
			await refreshLiveHash();
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Markdown import failed';
		} finally {
			busy = null;
		}
	}

	function addUnmappedAsCustom(block: UnmappedBlock) {
		cv = {
			...cv,
			customSections: [
				...cv.customSections,
				{
					id: crypto.randomUUID(),
					title: block.heading,
					content: block.body.split('\n').filter(Boolean)
				}
			]
		};
		unmapped = unmapped.filter((b) => b !== block);
	}
</script>

<svelte:head>
	<title>CV Forge</title>
</svelte:head>

<main class="app">
	<header class="hero">
		<h1>CV Forge</h1>
		<p>Import a CV, preview it, then accept and export a PDF.</p>
	</header>

	<section class="toolbar">
		<button type="button" data-testid="load-sample-btn" onclick={() => void loadSample()}>
			Load fictional sample
		</button>
		<label class="file-btn">
			Import Markdown
			<input
				type="file"
				accept="text/markdown,.md"
				onchange={(e) => {
					const file = e.currentTarget.files?.[0];
					if (file) void importMarkdownFile(file);
				}}
			/>
		</label>
	</section>

	{#if busy}
		<p class="status" role="status">Working… ({busy})</p>
	{/if}
	{#if status}
		<p class="status" role="status">{status}</p>
	{/if}
	{#if errorMessage}
		<p class="error" role="alert" data-testid="error-banner">{errorMessage}</p>
	{/if}

	{#if importWarnings.length}
		<ul class="warnings">
			{#each importWarnings as warning, index (index)}
				<li>{warning}</li>
			{/each}
		</ul>
	{/if}

	{#if unmapped.length}
		<section class="unmapped">
			<h2>Unmapped import content</h2>
			{#each unmapped as block (block.heading + block.body)}
				<article>
					<h3>{block.heading}</h3>
					<pre>{block.body}</pre>
					<button type="button" onclick={() => addUnmappedAsCustom(block)}
						>Add as custom section</button
					>
				</article>
			{/each}
		</section>
	{/if}

	<div class="workspace">
		<div class="workspace-json">
			<JsonImportValidator disabled={busy !== null} onrender={renderValidatedJson} />
		</div>
		<div class="panel workspace-preview">
			<h2>Preview</h2>
			<div class="cv-preview-shell">
				<CvDocumentPreview {cv} />
			</div>
			<div class="actions">
				<button type="button" data-testid="accept-btn" disabled={busy !== null} onclick={acceptCv}>
					Accept CV
				</button>
				<button
					type="button"
					data-testid="generate-pdf-btn"
					disabled={busy !== null || !acceptance.snapshotId}
					onclick={generatePdf}
				>
					Generate PDF
				</button>
			</div>
			<p class="hash">Content hash: {liveHash ?? '…'}</p>
			{#if acceptance.snapshotId}
				<p class="hash">Accepted snapshot: {acceptance.snapshotId}</p>
			{/if}
		</div>
	</div>

	<QualityReport
		{checks}
		downloadAllowed={downloadAllowed && Boolean(acceptance.snapshotId)}
		downloadSnapshotId={acceptance.snapshotId}
	/>
</main>

<style>
	:global(body) {
		margin: 0;
		font-family: system-ui, sans-serif;
		background: #f8fafc;
		color: #0f172a;
	}

	.app {
		max-width: min(100%, 1600px);
		margin: 0 auto;
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.hero h1 {
		margin: 0;
	}

	.toolbar {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		align-items: center;
	}

	.file-btn input {
		display: none;
	}

	.file-btn,
	button {
		font: inherit;
		padding: 0.45rem 0.75rem;
		border-radius: 6px;
		border: 1px solid #cbd5e1;
		background: #fff;
		cursor: pointer;
	}

	.workspace {
		display: flex;
		flex-direction: row;
		align-items: stretch;
		gap: 1rem;
		min-width: 0;
	}

	.workspace-json {
		flex: 2;
		min-width: 0;
	}

	.workspace-preview {
		flex: 6;
		min-width: 0;
	}

	@media (max-width: 960px) {
		.workspace {
			flex-direction: column;
		}

		.workspace-json,
		.workspace-preview {
			flex: 1 1 auto;
			width: 100%;
		}
	}

	.panel {
		background: #fff;
		border: 1px solid #e2e8f0;
		border-radius: 10px;
		padding: 1rem;
	}

	.actions {
		display: flex;
		gap: 0.75rem;
		margin-top: 1rem;
	}

	.status {
		color: #0369a1;
		margin: 0;
	}

	.error {
		color: #b91c1c;
		background: #fef2f2;
		padding: 0.75rem;
		border-radius: 8px;
		margin: 0;
	}

	.warnings {
		margin: 0;
		padding-left: 1.25rem;
		color: #854d0e;
	}

	.unmapped pre {
		white-space: pre-wrap;
		background: #f1f5f9;
		padding: 0.5rem;
		border-radius: 6px;
	}

	.hash {
		font-size: 0.8rem;
		color: #64748b;
		word-break: break-all;
	}
</style>
