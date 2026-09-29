<script lang="ts">
	// Reference Shelf: a way out of ACKB for general electronics, grouped by what the site is for.
	import { resolve } from '$app/paths';
	import type { Reference } from '$lib/types';

	let { data } = $props();

	const CATEGORIES: { id: Reference['category']; label: string }[] = [
		{ id: 'learning', label: 'Learning' },
		{ id: 'simulation', label: 'Simulation' },
		{ id: 'calculators', label: 'Calculators' },
		{ id: 'parts', label: 'Parts & Datasheets' }
	];
	const groups = $derived(
		CATEGORIES.map((c) => ({
			...c,
			items: data.references.filter((r) => r.category === c.id).sort((a, b) => a.title.localeCompare(b.title))
		})).filter((g) => g.items.length)
	);
	const host = (url: string) => new URL(url).hostname.replace(/^www\./, '');
</script>

<svelte:head>
	<title>Reference Shelf · ACKB</title>
	<meta name="description" content="General electronics sites for the basics behind synthesizer circuits." />
</svelte:head>

<h1>Reference Shelf</h1>
<p class="lead">
	General electronics sites for the basics behind synth circuits. They aren't part of the
	<a href={resolve('/')}>index</a>: they don't show up in search or filters, and their pages aren't tagged one by one.
</p>

{#each groups as g (g.id)}
	<h2>{g.label}</h2>
	<ul class="shelf">
		{#each g.items as r (r.id)}
			<li>
				<a class="title" href={r.url} target="_blank" rel="noopener external" data-out="reference"
					>{r.title}<span class="out" aria-hidden="true"> ↗</span><span class="visually-hidden"> (opens in a new tab)</span></a
				>
				<span class="host mono">{host(r.url)}</span>{#if r.lang}<span class="muted"> · {r.lang.toUpperCase()}</span>{/if}
				<p>{r.summary}</p>
			</li>
		{/each}
	</ul>
{/each}

<style>
	.lead {
		max-width: 46rem;
	}

	h2 {
		font-size: 1rem;
		margin: 1.6rem 0 0.4rem;
	}

	.shelf {
		list-style: none;
		padding: 0;
		margin: 0;
		max-width: 46rem;
	}

	.shelf li {
		padding: 0.7rem 0;
		border-bottom: 1px solid var(--line);
	}

	.title {
		font-weight: 600;
	}

	.out {
		font-weight: 400;
		color: var(--muted);
	}

	.host {
		margin-left: 0.5rem;
		font-size: 0.8rem;
		color: var(--muted);
	}

	p {
		margin: 0.25rem 0 0;
		color: var(--muted);
		font-size: 0.93rem;
	}
</style>
