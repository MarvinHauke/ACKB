<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import ArticleList from '$lib/components/ArticleList.svelte';
	import { loadHiddenTypes, loadHideHttp } from '$lib/source-types';
	import { REGISTRY_META, termPath } from '$lib/types';

	let { data } = $props();
	const term = $derived(data.term);
	const labels = $derived(new Map(Object.entries(data.labels)));
	const href = (slug: string, path: string) => resolve('/[type=node]/[...path]', { type: slug, path });
	// The search page filtered by this tag, to combine it with other filters.
	const searchHref = $derived(`${resolve('/')}?${data.meta.slug}=${encodeURIComponent(termPath(term.id, term.parent))}`);

	const IC_CATEGORY_LABEL: Record<string, string> = {
		ota: 'OTA',
		vca: 'VCA',
		opamp: 'op-amp',
		dac: 'DAC',
		mcu: 'microcontroller',
		'transistor-array': 'transistor array'
	};

	// "Same kind" heading per node type.
	const SAME_LABEL: Record<string, string> = $derived({
		ics: term.category ? `Other ${IC_CATEGORY_LABEL[term.category] ?? term.category.replace('_', ' ')}s & alternatives` : 'Similar ICs',
		products: 'More from this maker',
		manufacturers: 'Products',
		modules: 'Related modules',
		subcircuits: 'Related subcircuits',
		functions: 'Related functions',
		authors: 'Related'
	});

	// Hidden source types / http links from the search page also apply here (read after hydration).
	let hiddenTypes: string[] = $state([]);
	let hideHttp = $state(false);
	onMount(() => {
		hiddenTypes = loadHiddenTypes();
		hideHttp = loadHideHttp();
	});
</script>

<svelte:head>
	<title>{term.label} · {data.meta.label} · ACKB</title>
	<meta
		name="description"
		content={term.description ?? `${data.articles.length} curated resources on ${term.label} in synthesizer circuits.`}
	/>
</svelte:head>

<p class="badge">
	{data.meta.label}{#if data.parent}
		· <a href={href(data.meta.slug, data.parent.id)}>{data.parent.label}</a>{/if}
</p>
<h1>{term.label}</h1>
{#if term.description}<p class="lead">{term.description}</p>{/if}

<dl class="facts">
	{#if term.aliases?.length}
		<dt>Also known as</dt>
		<dd>{term.aliases.join(', ')}</dd>
	{/if}
	{#if data.maker}
		<dt>Manufacturer</dt>
		<dd><a href={href('manufacturer', data.maker.id)}>{data.maker.label}</a>{term.year ? ` · ${term.year}` : ''}</dd>
	{:else if term.manufacturer}
		<dt>Manufacturer</dt>
		<dd>{term.manufacturer}</dd>
	{/if}
	{#if term.category}
		<dt>Category</dt>
		<dd>{IC_CATEGORY_LABEL[term.category] ?? term.category.replace('_', ' ')}{term.status ? ` · ${term.status}` : ''}</dd>
	{/if}
	{#if term.datasheetUrl}
		<dt>Datasheet</dt>
		<dd><a href={term.datasheetUrl} target="_blank" rel="noopener external" data-out="datasheet">Open datasheet ↗</a></dd>
	{/if}
	{#if term.pdfOcrKind}
		<dt>PDF_OCR kind</dt>
		<dd class="mono">{term.pdfOcrKind}</dd>
	{/if}
	{#if term.url}
		<dt>Website</dt>
		<dd><a href={term.url} target="_blank" rel="noopener external" data-out="author">{term.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')} ↗</a></dd>
	{/if}
	{#if data.children.length}
		<dt>{data.key === 'modules' ? 'Subtypes' : 'Includes'}</dt>
		<dd>
			<ul class="chips">
				{#each data.children as c (c.path)}<li><a class="chip" href={href(data.meta.slug, c.path)}>{c.label}</a></li>{/each}
			</ul>
		</dd>
	{/if}
</dl>

{#if data.same.length || data.together.length}
	<section class="related">
		{#if data.same.length}
			<h2>{SAME_LABEL[data.key]}</h2>
			<ul class="chips">
				{#each data.same as r (r.key + r.id)}<li><a class="chip" href={href(r.slug, r.path)}>{r.label}</a></li>{/each}
			</ul>
		{/if}
		{#if data.together.length}
			<h2>Often used together</h2>
			<ul class="chips">
				{#each data.together as r (r.key + r.id)}
					<li>
						<a class="chip" href={href(r.slug, r.path)} title="{REGISTRY_META[r.key].label}, {r.n} shared articles"
							>{r.label} <span class="muted">{r.n}</span></a
						>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
{/if}

<h2 class="articles-head">
	Articles <span class="muted">{data.articles.length}</span>
	<a class="search" href={searchHref}>Open in search →</a>
</h2>
<ArticleList articles={data.articles} {labels} parents={data.parents} {hiddenTypes} {hideHttp} />

<style>
	.lead {
		font-size: 1.05rem;
	}

	.facts {
		display: grid;
		grid-template-columns: max-content 1fr;
		gap: 0.35rem 1rem;
		margin: 1rem 0 1.5rem;
	}

	dt {
		color: var(--muted);
		font-size: 0.9rem;
	}

	dd {
		margin: 0;
	}

	.related h2 {
		font-size: 1rem;
		margin: 1.2rem 0 0.5rem;
	}

	a.chip {
		text-decoration: none;
		color: inherit;
	}

	.articles-head {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		margin-top: 2rem;
	}

	.articles-head .search {
		margin-left: auto;
		font-size: 0.9rem;
		font-weight: 400;
	}

	@media (max-width: 30rem) {
		.facts {
			grid-template-columns: 1fr;
			gap: 0.1rem;
		}

		dd {
			margin-bottom: 0.5rem;
		}
	}
</style>
