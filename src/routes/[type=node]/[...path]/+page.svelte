<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import ArticleList from '$lib/components/ArticleList.svelte';
	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
	import Basics from '$lib/components/Basics.svelte';
	import { loadHiddenTypes, loadHideHttp } from '$lib/source-types';
	import { CONTENT_KINDS, KIND_LABEL, REGISTRY_META, termPath, type ContentKind } from '$lib/types';

	let { data } = $props();
	const term = $derived(data.term);
	const labels = $derived(new Map(Object.entries(data.labels)));
	const href = (slug: string, path: string) => resolve('/[type=node]/[...path]', { type: slug, path });
	// The search page filtered by this tag, to combine it with other filters.
	const searchHref = $derived(`${resolve('/')}?${data.meta.slug}=${encodeURIComponent(termPath(term.id, term.parent))}`);

	const breadcrumbLd = $derived(
		JSON.stringify({
			'@context': 'https://schema.org',
			'@type': 'BreadcrumbList',
			itemListElement: data.seo.crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, ...(c.url ? { item: c.url } : {}) }))
		}).replace(/</g, '\\u003c')
	);

	const CATEGORY_LABEL: Record<string, string> = {
		ota: 'OTA',
		vca: 'VCA',
		opamp: 'op-amp',
		dac: 'DAC',
		mcu: 'microcontroller',
		'transistor-array': 'transistor array',
		optical: 'optical component',
		magnetic: 'magnetic component'
	};

	// "Same kind" heading per node type.
	const SAME_LABEL: Record<string, string> = $derived({
		components: term.category ? `Other ${CATEGORY_LABEL[term.category] ?? term.category.replace('_', ' ')}s & alternatives` : 'Similar components',
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

	// Narrowing the article list: by kind (any selected), by author, first PAGE rows until "Show all".
	const PAGE = 20;
	let kinds: ContentKind[] = $state([]);
	let author = $state('');
	let showAll = $state(false);
	const kindCounts = $derived(
		CONTENT_KINDS.map((k) => ({ id: k, n: data.articles.filter((a) => a.kinds.includes(k)).length })).filter((k) => k.n)
	);
	const authors = $derived(
		[...new Set(data.articles.flatMap((a) => a.terms.authors))]
			.map((id) => ({ id, label: labels.get(id) ?? id }))
			.sort((a, b) => a.label.localeCompare(b.label))
	);
	const filtered = $derived(
		data.articles.filter(
			(a) => (!kinds.length || kinds.some((k) => a.kinds.includes(k))) && (!author || a.terms.authors.includes(author))
		)
	);
	const toggleKind = (k: ContentKind) => {
		kinds = kinds.includes(k) ? kinds.filter((x) => x !== k) : [...kinds, k];
	};
	// A different tag page reuses this component: start unfiltered.
	$effect(() => {
		void term.id;
		kinds = [];
		author = '';
		showAll = false;
	});
</script>

<svelte:head>
	<title>{data.seo.title}</title>
	<meta name="description" content={data.seo.description} />
	<link rel="canonical" href={data.seo.canonical} />
	{#if data.seo.noindex}<meta name="robots" content="noindex,follow" />{/if}
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- JSON-LD from our own data, '<' escaped -->
	{@html `<script type="application/ld+json">${breadcrumbLd}</script>`}
</svelte:head>

<Breadcrumbs
	items={[
		{ label: 'Home', href: resolve('/') },
		{ label: data.meta.plural },
		...(data.parent ? [{ label: data.parent.label, href: href(data.meta.slug, data.parent.id) }] : []),
		{ label: term.label }
	]}
/>
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
	{#if term.status}
		<dt>Status</dt>
		<dd>{term.status}</dd>
	{/if}
	{#if term.successors?.length}
		<dt>Reissues & replacements</dt>
		<dd>
			<ul class="successors">
				{#each term.successors as s (s.part)}
					<li>
						<span class="muted">{s.kind === 'reissue' ? 'Reissue' : 'Replacement'}:</span>
						{#if s.url}<a href={s.url} target="_blank" rel="noopener external" data-out="successor">{s.maker} {s.part} ↗</a
							>{:else}{s.maker} {s.part}{/if}{#if s.note}<span class="muted"> · {s.note}</span>{/if}
					</li>
				{/each}
			</ul>
		</dd>
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

<Basics links={data.basics} />

<h2 class="articles-head">
	Articles <span class="muted">{filtered.length < data.articles.length ? `${filtered.length} of ` : ''}{data.articles.length}</span>
	<a class="search" href={searchHref}>Open in search →</a>
</h2>
{#if data.articles.length > 12 && (kindCounts.length > 1 || authors.length > 1)}
	<div class="narrow">
		{#if kindCounts.length > 1}
			<ul class="chips" aria-label="Filter by kind">
				{#each kindCounts as k (k.id)}
					<li>
						<button class="chip" class:on={kinds.includes(k.id)} aria-pressed={kinds.includes(k.id)} onclick={() => toggleKind(k.id)}
							>{KIND_LABEL[k.id]} <span class="muted">{k.n}</span></button
						>
					</li>
				{/each}
			</ul>
		{/if}
		{#if authors.length > 1}
			<select bind:value={author} aria-label="Filter by author">
				<option value="">All authors</option>
				{#each authors as a (a.id)}<option value={a.id}>{a.label}</option>{/each}
			</select>
		{/if}
	</div>
{/if}
<ArticleList
	articles={filtered}
	{labels}
	parents={data.parents}
	{hiddenTypes}
	{hideHttp}
	hideCommunity
	limit={showAll ? undefined : PAGE}
/>
{#if !showAll && filtered.length > PAGE}
	<button class="more" onclick={() => (showAll = true)}>Show all {filtered.length}</button>
{/if}

{#if data.same.length || data.together.length}
	<section class="related">
		{#if data.same.length}
			<h2>{SAME_LABEL[data.key]}</h2>
			<ul class="chips">
				{#each data.same as r (r.key + r.id)}<li><a class="chip" href={href(r.slug, r.path)}>{r.label}</a></li>{/each}
			</ul>
		{/if}
		{#if data.together.length}
			<details>
				<summary>Often used together <span class="muted">{data.together.length}</span></summary>
				<ul class="chips">
					{#each data.together as r (r.key + r.id)}
						<li>
							<a class="chip" href={href(r.slug, r.path)} title="{REGISTRY_META[r.key].label}, {r.n} shared articles"
								>{r.label} <span class="muted">{r.n}</span></a
							>
						</li>
					{/each}
				</ul>
			</details>
		{/if}
	</section>
{/if}

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

	.successors {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.related details {
		margin-top: 1rem;
	}

	.related summary {
		cursor: pointer;
		font-weight: 600;
		font-size: 1rem;
		margin-bottom: 0.5rem;
	}

	.related {
		margin-top: 2rem;
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

	.narrow {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem 1rem;
		margin: 0.2rem 0 0.6rem;
	}

	button.chip {
		font: inherit;
		color: inherit;
		cursor: pointer;
	}

	button.chip.on {
		border-color: var(--accent);
		color: var(--accent);
	}

	.more {
		margin-top: 0.8rem;
		padding: 0.35rem 0.8rem;
		font: inherit;
		color: var(--accent);
		background: none;
		border: 1px solid var(--accent);
		border-radius: 4px;
		cursor: pointer;
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
