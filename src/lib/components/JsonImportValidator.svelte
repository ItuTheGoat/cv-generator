<script lang="ts">
	import { browser } from '$app/env';
	import { asset } from '$app/paths';
	import { importJson } from '#lib/cv/json-import.js';
	import type { JsonImportResult } from '#lib/cv/json-import.js';
	import type { Cv } from '#lib/cv/schema.js';
	import type { Attachment } from 'svelte/attachments';
	import { JSONEditor, Mode, toTextContent, type Content } from 'svelte-jsoneditor';

	let {
		isOpen = false,
		onClose,
		disabled = false,
		onrender
	}: {
		isOpen?: boolean;
		onClose?: () => void;
		disabled?: boolean;
		onrender: (cv: Cv) => void | Promise<void>;
	} = $props();

	let dialogEl = $state<HTMLDialogElement | undefined>();
	let editing = $state(false);
	let templateLoaded = $state(false);
	let content = $state<Content>({ text: '' });
	let report = $state<JsonImportResult | null>(null);
	let readyCv = $state<Cv | null>(null);
	let validating = $state(false);
	let requestError = $state<string | null>(null);

	const watchJsonFile: Attachment<HTMLInputElement> = (input) => {
		input.dataset.ready = 'true';
		const onFileChange = () => {
			const file = input.files?.[0];
			input.value = '';
			if (file) void loadFileIntoEditor(file);
		};
		input.addEventListener('change', onFileChange);
		return () => {
			delete input.dataset.ready;
			input.removeEventListener('change', onFileChange);
		};
	};

	const failureSummary: Record<Extract<JsonImportResult, { ok: false }>['kind'], string> = {
		syntax: 'The JSON is not valid.',
		size: 'The JSON is too large to import.',
		version: 'The schema version is not supported.',
		schema: 'The JSON failed schema validation.'
	};

	function isImportResult(value: unknown): value is JsonImportResult {
		if (typeof value !== 'object' || value === null) return false;
		const record = value as { ok?: unknown; messages?: unknown; cv?: unknown };
		if (record.ok === true) return typeof record.cv === 'object' && record.cv !== null;
		return record.ok === false && Array.isArray(record.messages);
	}

	function contentToText(value: Content): string {
		return toTextContent(value).text;
	}

	function clearValidationState() {
		report = null;
		readyCv = null;
		requestError = null;
	}

	function handleEditorChange(updatedContent: Content) {
		if (!editing) return;
		content = updatedContent;
		clearValidationState();
	}

	async function ensureTemplateLoaded() {
		if (templateLoaded) return;
		const res = await fetch(asset('examples/cv.template.json'));
		if (!res.ok) throw new Error('Could not load JSON template');
		content = { text: await res.text() };
		templateLoaded = true;
		editing = false;
		clearValidationState();
	}

	$effect(() => {
		if (!browser || !isOpen || !dialogEl) return;
		void (async () => {
			try {
				await ensureTemplateLoaded();
			} catch (error) {
				requestError = error instanceof Error ? error.message : 'Could not load JSON template';
			}
			if (isOpen && !dialogEl.open) {
				dialogEl.showModal();
			}
		})();
	});

	function closeDialog() {
		dialogEl?.close();
		onClose?.();
	}

	function startEditing() {
		editing = true;
		clearValidationState();
	}

	async function loadFileIntoEditor(file: File) {
		editing = true;
		content = { text: await file.text() };
		clearValidationState();
	}

	async function validateCurrent() {
		const text = contentToText(content);
		report = null;
		readyCv = null;
		requestError = null;
		validating = true;
		try {
			const local = importJson(text);
			if (!local.ok) {
				report = local;
				return;
			}

			const response = await fetch('/api/import/json', {
				method: 'POST',
				headers: { 'Content-Type': 'text/plain' },
				body: text
			});
			const body: unknown = await response.json();
			if (!isImportResult(body)) {
				requestError = 'The server returned an unexpected validation response.';
				return;
			}
			report = body;
			readyCv = body.ok ? body.cv : null;
		} catch (error) {
			requestError = error instanceof Error ? error.message : 'JSON validation failed';
		} finally {
			validating = false;
		}
	}

	async function renderValidated() {
		if (!readyCv || validating || disabled) return;
		await onrender(readyCv);
		closeDialog();
	}
</script>

{#if isOpen}
<dialog
	bind:this={dialogEl}
	class="modal modal-open"
	aria-labelledby="json-import-heading"
	data-testid="json-dialog"
>
	<div class="modal-box flex max-h-[min(90vh,52rem)] w-11/12 max-w-5xl flex-col gap-3 p-4 sm:p-6">
		<header>
			<h2 id="json-import-heading" class="text-lg font-semibold">JSON import</h2>
			<p class="mt-1 text-sm text-base-content/70">
				Validate your CV JSON, then render to update the preview. Choose Edit JSON to change the
				template.
			</p>
		</header>

		<div class="flex flex-wrap items-center gap-2">
			<a
				href={asset('examples/cv.template.json')}
				download="cv.template.json"
				class="btn btn-sm btn-outline"
				data-testid="json-template-link"
			>
				Download template
			</a>
			<button
				type="button"
				class="btn btn-sm btn-outline"
				disabled={disabled || validating}
				onclick={startEditing}
				data-testid="edit-json-btn"
			>
				Edit JSON
			</button>
			<label class="btn btn-sm btn-outline cursor-pointer">
				JSON file
				<input
					{@attach watchJsonFile}
					type="file"
					class="hidden"
					accept="application/json,.json"
					data-testid="validate-json-input"
					disabled={disabled || validating}
				/>
			</label>
			<button
				type="button"
				class="btn btn-sm btn-outline"
				data-testid="validate-json-btn"
				disabled={disabled || validating}
				onclick={() => void validateCurrent()}
			>
				Validate JSON
			</button>
			<button
				type="button"
				class="btn btn-sm btn-primary"
				data-testid="render-json-btn"
				disabled={disabled || validating || !readyCv}
				onclick={() => void renderValidated()}
			>
				Render preview
			</button>
		</div>

		<div
			class="min-h-64 flex-1 overflow-hidden rounded-box border border-base-300"
			data-testid="json-source-editor"
		>
			{#if browser}
				<JSONEditor
					{content}
					mode={Mode.text}
					readOnly={!editing}
					onChange={handleEditorChange}
				/>
			{:else}
				<p class="p-4 text-sm text-base-content/60">Loading JSON editor…</p>
			{/if}
		</div>

		{#if validating}
			<p class="text-sm text-info" role="status">Validating JSON…</p>
		{/if}

		{#if requestError}
			<div role="alert" class="alert alert-error text-sm" data-testid="json-validation-report">
				<span>{requestError}</span>
			</div>
		{:else if report}
			<div
				role={report.ok ? 'status' : 'alert'}
				class="alert text-sm {report.ok ? 'alert-success' : 'alert-error'}"
				data-testid="json-validation-report"
			>
				<div>
					{#if report.ok}
						<p>The JSON in the editor is valid. Render it to update the preview.</p>
					{:else}
						<p>
							{failureSummary[report.kind]} The preview was left unchanged.
						</p>
						<ul class="mt-2 list-disc pl-5">
							{#each report.messages as message, index (index)}
								<li>{message}</li>
							{/each}
						</ul>
					{/if}
				</div>
			</div>
		{/if}

		<div class="modal-action mt-0">
			<button type="button" class="btn btn-sm" onclick={closeDialog}>Close</button>
		</div>
	</div>
	<button type="button" class="modal-backdrop" aria-label="Close JSON dialog" onclick={closeDialog}
	></button>
</dialog>
{/if}

<style>
	[data-testid='json-source-editor'] :global(.jse-main) {
		min-height: 16rem;
		height: 100%;
	}
</style>
