<script lang="ts">
	// References: general electronics sites, each with the pages that explain ACKB tags ("Need the basics?").
	import { resolve } from '$app/paths';
	import type { ReferencePage, ReferenceSite } from '$lib/types';

	let { data } = $props();

	const CATEGORIES: { id: ReferenceSite['category']; label: string }[] = [
		{ id: 'learning', label: 'Learning' },
		{ id: 'simulation', label: 'Simulation' },
		{ id: 'calculators', label: 'Calculators' },
		{ id: 'parts', label: 'Parts & Datasheets' }
	];
	const sites = $derived(data.references.filter((r): r is ReferenceSite => !r.site));
	const pages = $derived(data.references.filter((r): r is ReferencePage => Boolean(r.site)));
	const groups = $derived(
		CATEGORIES.map((c) => ({
			...c,
			items: sites
				.filter((r) => r.category === c.id)
				.sort((a, b) => a.title.localeCompare(b.title))
				.map((site) => ({ site, pages: pages.filter((p) => p.site === site.id).sort((a, b) => a.title.localeCompare(b.title)) }))
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
	General electronics sites for the basics behind synth circuits, with the pages that explain tags from the
	<a href={resolve('/')}>index</a>. They aren't part of the index itself: tag and article pages offer them under
	"Need the basics?", search and filters don't.
</p>

{#each groups as g (g.id)}
	<h2>{g.label}</h2>
	<ul class="shelf">
		{#each g.items as { site: r, pages: ps } (r.id)}
			<li>
				<a class="title" href={r.url} target="_blank" rel="noopener external" data-out="reference"
					>{r.title}<span class="out" aria-hidden="true"> ↗</span><span class="visually-hidden"> (opens in a new tab)</span></a
				>
				<span class="host mono">{host(r.url)}</span>{#if r.lang}<span class="muted"> · {r.lang.toUpperCase()}</span>{/if}
				<p>{r.summary}</p>
				{#if ps.length}
					<ul class="pages">
						{#each ps as p (p.id)}
							<li>
								<a href={p.url} target="_blank" rel="noopener external" data-out="reference"
									>{p.title}<span class="out" aria-hidden="true"> ↗</span></a
								>
							</li>
						{/each}
					</ul>
				{/if}
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

	.pages {
		list-style: none;
		margin: 0.4rem 0 0;
		padding-left: 1rem;
		font-size: 0.9rem;
	}

	.pages li {
		padding: 0.1rem 0;
	}

	p {
		margin: 0.25rem 0 0;
		color: var(--muted);
		font-size: 0.93rem;
	}
</style>
