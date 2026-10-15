<script lang="ts">
	import { asset } from '$app/paths';
	import type { Component } from 'svelte';
	import CvDocumentPreview from '#lib/components/CvDocumentPreview.svelte';
	import QualityReport from '#lib/components/QualityReport.svelte';
	import { computeContentHash } from '#lib/cv/hash.js';
	import { createEmptyDraft, draftToCanonical } from '#lib/cv/form.js';
	import { importJson } from '#lib/cv/json-import.js';
	import { DEFAULT_TEMPLATE_ID } from '#lib/cv/schema.js';
	import type { Cv } from '#lib/cv/schema.js';
	import type { QualityCheck } from '#lib/quality/checks.js';

	let cv = $state<Cv>(createEmptyDraft());
	let acceptance = $state<{ snapshotId: string | null; contentHash: string | null }>({
		snapshotId: null,
		contentHash: null
	});
	let liveHash = $state<string | null>(null);
	let status = $state<string | null>(null);
	let errorMessage = $state<string | null>(null);
	let checks = $state<QualityCheck[]>([]);
	let downloadAllowed = $state(false);
	let busy = $state<'accept' | 'pdf' | null>(null);
	let jsonDialogOpen = $state(false);
	type JsonImportValidatorProps = {
		isOpen?: boolean;
		onClose?: () => void;
		disabled?: boolean;
		onrender: (cv: Cv) => void | Promise<void>;
	};
	let JsonImportValidator = $state<Component<JsonImportValidatorProps> | null>(null);

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
			const res = await fetch(asset('examples/alex-morgan.cv.json'));
			if (!res.ok) throw new Error('Could not load sample CV');
			const result = importJson(await res.text());
			if (!result.ok) throw new Error(result.messages.join('\n'));
			cv = result.cv;
			clearAcceptanceState('Rendered example preview (Alex Morgan).');
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
		cv = next;
		clearAcceptanceState('Rendered validated JSON CV.');
		await refreshLiveHash();
	}

	async function openJsonDialog() {
		if (!JsonImportValidator) {
			const module = await import('#lib/components/JsonImportValidator.svelte');
			JsonImportValidator = module.default;
		}
		jsonDialogOpen = true;
	}
</script>

<svelte:head>
	<title>CV Forge</title>
</svelte:head>

<main class="mx-auto flex min-h-dvh max-w-[min(100%,1600px)] flex-col gap-4 p-4 sm:p-6">
	<header class="navbar min-h-0 flex-wrap gap-3 rounded-box border border-base-300 bg-base-100 px-0 py-2">
		<div class="navbar-start flex min-w-0 flex-1 flex-col items-start gap-0">
			<h1 class="cv-forge-title text-2xl font-semibold leading-tight sm:text-3xl">CV Forge</h1>
			<p class="text-sm text-base-content/70">
				Import JSON, preview your CV, then accept and export a PDF.
			</p>
		</div>
		<div class="navbar-end flex flex-none flex-wrap gap-2">
			<a
				href={asset('examples/cv.template.json')}
				download="cv.template.json"
				class="btn btn-sm btn-outline"
				data-testid="download-json-template-btn"
			>
				Download JSON template
			</a>
			<button
				type="button"
				class="btn btn-sm btn-outline"
				data-testid="view-json-btn"
				disabled={busy !== null}
				onclick={openJsonDialog}
			>
				View JSON
			</button>
			<button
				type="button"
				class="btn btn-sm btn-secondary"
				data-testid="render-example-preview-btn"
				disabled={busy !== null}
				onclick={() => void loadSample()}
			>
				Render example preview
			</button>
		</div>
	</header>

	{#if busy}
		<div role="status" class="alert alert-info py-2 text-sm">
			<span>Working… ({busy})</span>
		</div>
	{/if}
	{#if status}
		<div role="status" class="alert alert-info py-2 text-sm">
			<span>{status}</span>
		</div>
	{/if}
	{#if errorMessage}
		<div role="alert" class="alert alert-error py-2 text-sm" data-testid="error-banner">
			<span>{errorMessage}</span>
		</div>
	{/if}

	<section class="card card-border bg-base-100 shadow-sm">
		<div class="card-body gap-4">
			<h2 class="card-title text-lg">Preview</h2>
			<div class="min-w-0 overflow-x-auto">
				<CvDocumentPreview {cv} />
			</div>
			<div class="card-actions flex-wrap">
				<button
					type="button"
					class="btn btn-sm btn-outline"
					data-testid="accept-btn"
					disabled={busy !== null}
					onclick={acceptCv}
				>
					Accept CV
				</button>
				<button
					type="button"
					class="btn btn-sm btn-outline"
					data-testid="generate-pdf-btn"
					disabled={busy !== null || !acceptance.snapshotId}
					onclick={generatePdf}
				>
					Generate PDF
				</button>
			</div>
			<p class="text-xs text-base-content/60 break-all">Content hash: {liveHash ?? '…'}</p>
			{#if acceptance.snapshotId}
				<p class="text-xs text-base-content/60 break-all">
					Accepted snapshot: {acceptance.snapshotId}
				</p>
			{/if}
		</div>
	</section>

	<QualityReport
		{checks}
		downloadAllowed={downloadAllowed && Boolean(acceptance.snapshotId)}
		downloadSnapshotId={acceptance.snapshotId}
	/>

	{#if JsonImportValidator}
		<JsonImportValidator
			isOpen={jsonDialogOpen}
			onClose={() => {
				jsonDialogOpen = false;
			}}
			disabled={busy !== null}
			onrender={renderValidatedJson}
		/>
	{/if}
</main>
