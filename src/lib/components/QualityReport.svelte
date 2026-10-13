<script lang="ts">
	import { resolve } from '$app/paths';
	import type { QualityCheck } from '#lib/quality/checks.js';
	import { hasBlockingChecks } from '#lib/quality/checks.js';

	let {
		checks,
		downloadSnapshotId = null,
		downloadAllowed = false
	}: {
		checks: QualityCheck[];
		downloadSnapshotId?: string | null;
		downloadAllowed?: boolean;
	} = $props();

	const downloadHref = $derived(
		downloadSnapshotId ? resolve('/api/pdf/[id]', { id: downloadSnapshotId }) : null
	);

	const blocking = $derived(hasBlockingChecks(checks));
</script>

<section class="report" aria-live="polite">
	<h2>Document quality</h2>
	{#if !checks.length}
		<p class="muted">No checks yet. Accept your CV and generate a PDF.</p>
	{:else}
		<ul class="check-list">
			{#each checks as check (check.id + check.message)}
				<li class={check.severity}>
					<span class="badge">{check.severity}</span>
					{check.message}
					{#if check.heuristic}
						<span class="hint">(heuristic)</span>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}

	{#if downloadAllowed && downloadHref && !blocking}
		<a class="download" href={downloadHref} download>Download PDF</a>
	{:else if downloadHref && blocking}
		<p class="error-text">Download blocked until blocking checks pass.</p>
	{/if}
</section>

<style>
	.report {
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		padding: 1rem;
		background: #fff;
	}

	h2 {
		margin: 0 0 0.75rem;
		font-size: 1.1rem;
	}

	.muted {
		color: #64748b;
		margin: 0;
	}

	.check-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.check-list li {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
		align-items: baseline;
		font-size: 0.95rem;
	}

	.badge {
		font-size: 0.7rem;
		text-transform: uppercase;
		font-weight: 600;
		padding: 0.1rem 0.35rem;
		border-radius: 4px;
		background: #e2e8f0;
	}

	li.error .badge {
		background: #fecaca;
		color: #991b1b;
	}

	li.warning .badge {
		background: #fef08a;
		color: #854d0e;
	}

	.hint {
		color: #64748b;
		font-size: 0.85rem;
	}

	.download {
		display: inline-block;
		margin-top: 1rem;
		padding: 0.5rem 1rem;
		background: #2c5282;
		color: #fff;
		text-decoration: none;
		border-radius: 6px;
		font-weight: 600;
	}

	.error-text {
		color: #b91c1c;
		margin: 1rem 0 0;
	}
</style>
