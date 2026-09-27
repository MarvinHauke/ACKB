<script lang="ts">
	import { onMount } from 'svelte';
	import { replaceState } from '$app/navigation';
	import EntryList from '$lib/components/EntryList.svelte';
	import {
		FILTER_KEYS,
		activeCount,
		buildFacetIndex,
		emptyFilters,
		filtersFromParams,
		filtersToParams,
		matchingIds,
		type FilterKey,
		type Filters
	} from '$lib/filters';
	import { loadSearch, type Searcher } from '$lib/search';
	import { REGISTRY_KEYS, REGISTRY_META } from '$lib/types';

	let { data } = $props();

	const facetIndex = $derived(buildFacetIndex(data.entries));
	const byId = $derived(new Map(data.entries.map((e) => [e.id, e])));
	const labels = $derived(new Map(REGISTRY_KEYS.flatMap((k) => data.terms[k].map((t) => [t.id, t.label]))));

	const FACET_LABEL: Record<FilterKey, string> = {
		...(Object.fromEntries(REGISTRY_KEYS.map((k) => [k, REGISTRY_META[k].plural])) as Record<string, string>),
		difficulty: 'Difficulty',
		confidence: 'Confidence'
	} as Record<FilterKey, string>;

	// Facet options: taxonomy terms with labels, difficulty/confidence as plain values.
	const options = $derived(
		Object.fromEntries(
			FILTER_KEYS.map((k) => [
				k,
				k === 'difficulty'
					? data.difficulties.map((v) => ({ id: v, label: v }))
					: k === 'confidence'
						? data.confidences.map((v) => ({ id: v, label: v }))
						: data.terms[k]
			])
		) as Record<FilterKey, { id: string; label: string }[]>
	);

	let query = $state('');
	let filters: Filters = $state(emptyFilters());
	let searcher: Searcher | null = $state(null);
	let searchFailed = $state(false);

	onMount(() => {
		const params = new URLSearchParams(location.search);
		query = params.get('q') ?? '';
		filters = filtersFromParams(params);
		if (query) warmSearch();
	});

	function syncUrl() {
		const params = filtersToParams(filters, query.trim()).toString();
		replaceState(params ? `?${params}` : location.pathname, {});
	}

	function warmSearch() {
		if (searcher) return;
		loadSearch()
			.then((s) => (searcher = s))
			.catch(() => (searchFailed = true));
	}

	function toggle(key: FilterKey, id: string) {
		const list = filters[key];
		filters[key] = list.includes(id) ? list.filter((v) => v !== id) : [...list, id];
		syncUrl();
	}

	function clearAll() {
		filters = emptyFilters();
		query = '';
		syncUrl();
	}

	const facetMatch = $derived(matchingIds(facetIndex, filters));
	const q = $derived(query.trim());

	const results = $derived.by(() => {
		const allowed = (id: string) => facetMatch === null || facetMatch.has(id);
		if (!q) return data.entries.filter((e) => allowed(e.id));
		if (searcher) {
			return searcher(q)
				.filter((r) => allowed(r.id))
				.map((r) => byId.get(r.id)!)
				.filter(Boolean);
		}
		// Until Fuse is loaded: plain substring match, so typing never shows an empty page.
		const needle = q.toLowerCase();
		return data.entries.filter(
			(e) => allowed(e.id) && (e.title.toLowerCase().includes(needle) || e.summary.toLowerCase().includes(needle))
		);
	});

	const isFiltering = $derived(q !== '' || activeCount(filters) > 0);

	// Counts per option within the current result set; options with no match are hidden unless selected.
	const facetCounts = $derived.by(() => {
		const ids = new Set(results.map((e) => e.id));
		const counts = {} as Record<FilterKey, Map<string, number>>;
		for (const key of FILTER_KEYS) {
			counts[key] = new Map();
			for (const [value, set] of facetIndex[key]) {
				let n = 0;
				for (const id of set) if (ids.has(id)) n++;
				counts[key].set(value, n);
			}
		}
		return counts;
	});

	const popularFunctions = $derived([...data.terms.functions].sort((a, b) => b.count - a.count).slice(0, 12));
</script>

<svelte:head>
	<title>Analog Circuit Knowledge Base</title>
	<meta
		name="description"
		content="Curated index of papers, datasheets and build logs on synthesizer circuits (analog, digital, mixed), searchable by subcircuit, function and IC."
	/>
</svelte:head>

<search class="searchbar">
	<label class="visually-hidden" for="q">Search</label>
	<input
		id="q"
		type="search"
		placeholder="Search: MS-20, LM13700, soft clipping, buffer …"
		autocomplete="off"
		bind:value={query}
		onfocus={warmSearch}
		oninput={syncUrl}
	/>
	{#if searchFailed}<span class="muted">Search index unavailable, using simple matching.</span>{/if}
</search>

<nav class="quick" aria-label="Circuit types">
	<ul class="chips">
		{#each data.terms.circuitTypes as t (t.id)}
			<li>
				<button
					class="chip"
					aria-pressed={filters.circuitTypes.includes(t.id)}
					onclick={() => toggle('circuitTypes', t.id)}>{t.label} <span class="muted">{t.count}</span></button
				>
			</li>
		{/each}
	</ul>
</nav>

<div class="layout">
	<aside aria-label="Filters">
		{#each FILTER_KEYS.filter((k) => k !== 'circuitTypes') as key (key)}
			{@const visible = options[key].filter(
				(o) => (facetCounts[key].get(o.id) ?? 0) > 0 || filters[key].includes(o.id)
			)}
			{#if visible.length}
				<details open={filters[key].length > 0 || key === 'functions' || key === 'subcircuits'}>
					<summary>{FACET_LABEL[key]}{filters[key].length ? ` (${filters[key].length})` : ''}</summary>
					<ul>
						{#each visible as o (o.id)}
							<li>
								<label>
									<input
										type="checkbox"
										checked={filters[key].includes(o.id)}
										onchange={() => toggle(key, o.id)}
									/>
									{o.label} <span class="muted">{facetCounts[key].get(o.id) ?? 0}</span>
								</label>
							</li>
						{/each}
					</ul>
				</details>
			{/if}
		{/each}
	</aside>

	<section>
		{#if isFiltering}
			<p class="status">
				{results.length}
				{results.length === 1 ? 'entry' : 'entries'}
				<button class="link" onclick={clearAll}>Clear all</button>
			</p>
			{#if results.length}
				<EntryList entries={results} {labels} />
			{:else}
				<p class="muted">No entry matches. Remove a filter or try a broader term.</p>
			{/if}
		{:else}
			<h2>Recent entries</h2>
			<EntryList entries={data.entries.slice(0, 10)} {labels} />

			<h2>Popular functions</h2>
			<ul class="chips">
				{#each popularFunctions as t (t.id)}
					<li>
						<button class="chip" onclick={() => toggle('functions', t.id)}
							>{t.label} <span class="muted">{t.count}</span></button
						>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</div>

<style>
	.searchbar {
		display: block;
		margin: 1rem 0 0.75rem;
	}

	input[type='search'] {
		width: 100%;
		font: inherit;
		font-size: 1.1rem;
		padding: 0.6rem 0.75rem;
		border: 1px solid var(--line);
		border-radius: 4px;
		background: var(--bg);
		color: var(--fg);
	}

	input[type='search']:focus {
		outline: 2px solid var(--accent);
		outline-offset: -1px;
	}

	.quick {
		margin-bottom: 1.25rem;
	}

	button.chip {
		font: inherit;
		font-size: 0.85rem;
		cursor: pointer;
	}

	button.chip[aria-pressed='true'] {
		background: var(--accent);
		border-color: var(--accent);
		color: var(--bg);
	}

	button.chip[aria-pressed='true'] .muted {
		color: inherit;
	}

	.layout {
		display: grid;
		grid-template-columns: 14rem 1fr;
		gap: 2rem;
	}

	aside {
		font-size: 0.9rem;
	}

	details {
		border-bottom: 1px solid var(--line);
		padding: 0.4rem 0;
	}

	summary {
		cursor: pointer;
		font-weight: 600;
	}

	aside ul {
		list-style: none;
		padding: 0;
		margin: 0.3rem 0 0;
		max-height: 16rem;
		overflow-y: auto;
	}

	aside label {
		display: flex;
		gap: 0.4rem;
		align-items: baseline;
		cursor: pointer;
	}

	aside label .muted {
		margin-left: auto;
		font-family: var(--mono);
		font-size: 0.8rem;
	}

	.status {
		margin: 0 0 0.5rem;
		color: var(--muted);
	}

	section > h2:first-child {
		margin-top: 0;
	}

	.link {
		background: none;
		border: 0;
		padding: 0;
		margin-left: 0.75rem;
		color: var(--accent);
		font: inherit;
		text-decoration: underline;
		cursor: pointer;
	}

	@media (max-width: 45rem) {
		.layout {
			grid-template-columns: 1fr;
			gap: 1rem;
		}

		aside {
			order: 2;
		}
	}
</style>
