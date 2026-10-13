<script lang="ts">
	import { browser } from '$app/env';
	import { asset } from '$app/paths';
	import { importJson } from '#lib/cv/json-import.js';
	import type { JsonImportResult } from '#lib/cv/json-import.js';
	import type { Cv } from '#lib/cv/schema.js';
	import type { Attachment } from 'svelte/attachments';
	import { JSONEditor, Mode, toTextContent, type Content } from 'svelte-jsoneditor';

	let {
		disabled = false,
		onrender
	}: {
		disabled?: boolean;
		onrender: (cv: Cv) => void | Promise<void>;
	} = $props();

	let fileName = $state<string | null>(null);
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
		content = updatedContent;
		clearValidationState();
	}

	async function loadFileIntoEditor(file: File) {
		fileName = file.name;
		const text = await file.text();
		content = { text };
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

	function renderValidated() {
		if (!readyCv || validating || disabled) return;
		void onrender(readyCv);
	}
</script>

<section class="json-import" aria-labelledby="json-import-heading">
	<div class="heading">
		<h2 id="json-import-heading">JSON import</h2>
		<p>
			Download the template, load or edit JSON below, then validate. The preview updates only after
			valid JSON is rendered.
		</p>
	</div>

	<div class="actions">
		<a
			href={asset('examples/cv.template.json')}
			download="cv.template.json"
			data-testid="json-template-link"
		>
			JSON template
		</a>
		<a href={asset('examples/alex-morgan.cv.json')} download>Example JSON</a>
		<label class="file-field">
			<span class="file-label">JSON file</span>
			<input
				{@attach watchJsonFile}
				type="file"
				accept="application/json,.json"
				data-testid="validate-json-input"
				disabled={disabled || validating}
			/>
		</label>
		<button
			type="button"
			data-testid="validate-json-btn"
			disabled={disabled || validating}
			onclick={() => void validateCurrent()}
		>
			Validate
		</button>
		<button
			type="button"
			data-testid="render-json-btn"
			disabled={disabled || validating || !readyCv}
			onclick={renderValidated}
		>
			Render validated CV
		</button>
	</div>

	<div class="editor-shell" data-testid="json-source-editor">
		{#if browser}
			<JSONEditor {content} mode={Mode.text} onChange={handleEditorChange} />
		{:else}
			<p class="editor-placeholder">Loading JSON editor…</p>
		{/if}
	</div>

	{#if validating}
		<p class="pending" role="status">Validating JSON…</p>
	{/if}

	{#if requestError}
		<p class="report bad" role="alert" data-testid="json-validation-report">{requestError}</p>
	{:else if report}
		<div
			class="report"
			class:ok={report.ok}
			class:bad={!report.ok}
			role={report.ok ? 'status' : 'alert'}
			data-testid="json-validation-report"
		>
			{#if report.ok}
				<p>The JSON in the editor is valid. Render it to update the preview.</p>
			{:else}
				<p>
					{failureSummary[report.kind]} The preview was left unchanged.
				</p>
				<ul>
					{#each report.messages as message, index (index)}
						<li>{message}</li>
					{/each}
				</ul>
			{/if}
		</div>
	{/if}
</section>

<style>
	.json-import {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		height: 100%;
		min-height: 0;
		background: #fff;
		border: 1px solid #e2e8f0;
		border-radius: 10px;
		padding: 1rem;
	}

	.heading h2,
	.heading p {
		margin: 0;
	}

	.heading p {
		margin-top: 0.35rem;
		color: #475569;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		align-items: center;
	}

	.file-field {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		font: inherit;
	}

	.file-label {
		font-size: 0.85rem;
		color: #475569;
	}

	.file-field input[type='file'] {
		font: inherit;
		max-width: 100%;
	}

	.file-field,
	button,
	a {
		font: inherit;
		padding: 0.45rem 0.75rem;
		border-radius: 6px;
		border: 1px solid #cbd5e1;
		background: #fff;
		color: inherit;
		text-decoration: none;
		cursor: pointer;
	}

	.file-field {
		padding: 0.35rem 0.75rem;
	}

	button:disabled,
	.file-field:has(input:disabled) {
		cursor: not-allowed;
		opacity: 0.6;
	}

	.editor-shell {
		flex: 1;
		min-height: 280px;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		overflow: hidden;
	}

	.editor-shell :global(.jse-main) {
		min-height: 100%;
		height: 100%;
	}

	.editor-placeholder {
		margin: 0;
		padding: 1rem;
		color: #64748b;
	}

	.pending {
		margin: 0;
		color: #0369a1;
	}

	.report {
		margin: 0;
		padding: 0.75rem;
		border-radius: 8px;
	}

	.report p {
		margin: 0;
	}

	.report ul {
		margin: 0.5rem 0 0;
		padding-left: 1.25rem;
	}

	.report.ok {
		background: #f0fdf4;
		color: #166534;
	}

	.report.bad {
		background: #fef2f2;
		color: #b91c1c;
	}
</style>
