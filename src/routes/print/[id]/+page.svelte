<script lang="ts">
	import { onMount } from 'svelte';
	import CvDocument from '#lib/cv/CvDocument.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let ready = $state(false);

	onMount(() => {
		void document.fonts.ready.then(() => {
			ready = true;
		});
	});
</script>

<svelte:head>
	<title>CV print — {data.cv.basics.name ?? 'CV Forge'}</title>
</svelte:head>

<div data-cv-ready={ready ? 'true' : 'false'}>
	<CvDocument cv={data.cv} mode="print" />
</div>
