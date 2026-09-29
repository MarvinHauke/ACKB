<script lang="ts">
	import { onMount } from 'svelte';
	import { replaceState } from '$app/navigation';
	import { resolve } from '$app/paths';
	import ArticleList from '$lib/components/ArticleList.svelte';
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
	import {
		SOURCE_TYPES,
		loadHiddenTypes,
		loadHideHttp,
		saveHiddenTypes,
		saveHideHttp,
		sourceVisible
	} from '$lib/source-types';
	import { COMPONENT_CATEGORY_GROUP, KIND_LABEL, REGISTRY_KEYS, REGISTRY_META, TERM_GROUPS } from '$lib/types';

	let { data } = $props();

	const facetIndex = $derived(buildFacetIndex(data.articles));
	const byId = $derived(new Map(data.articles.map((e) => [e.id, e])));
	const labels = $derived(
		new Map([
			...REGISTRY_KEYS.flatMap((k) => data.terms[k].map((t) => [t.id, t.label] as [string, string])),
			...Object.entries(KIND_LABEL)
		])
	);

	const FACET_LABEL: Record<FilterKey, string> = {
		...(Object.fromEntries(REGISTRY_KEYS.map((k) => [k, REGISTRY_META[k].plural])) as Record<string, string>),
		kind: 'Content kind',
		confidence: 'Confidence'
	} as Record<FilterKey, string>;

	type Option = {
		id: string;
		label: string;
		group?: string;
		parent?: string;
		manufacturer?: string;
		category?: string;
		status?: string;
		datasheetUrl?: string;
		alternatives?: string[];
		/** Articles using this term in the whole knowledge base (taxonomy terms only). */
		count?: number;
	};

	// Facet options: taxonomy terms with labels, content kinds with display names, confidence as plain values.
	const options = $derived(
		Object.fromEntries(
			FILTER_KEYS.map((k) => [
				k,
				k === 'kind'
					? data.kinds.map((v) => ({ id: v, label: KIND_LABEL[v] }))
					: k === 'confidence'
						? data.confidences.map((v) => ({ id: v, label: v }))
						: data.terms[k]
			])
		) as Record<FilterKey, Option[]>
	);

	let query = $state('');
	let filters: Filters = $state(emptyFilters());
	let searcher: Searcher | null = $state(null);
	let searchFailed = $state(false);
	// Filter groups start collapsed; groups with an active filter start open.
	let openGroups: Partial<Record<FilterKey, boolean>> = $state({});
	// Small screens: the filter column is hidden behind a button.
	let showFilters = $state(false);
	// Recently used filters, newest first; kept only in this browser.
	const RECENT_KEY = 'ackb:recent-filters';
	const RECENT_MAX = 6;
	let recent: { key: FilterKey; id: string }[] = $state([]);
	// Source types the reader unticked, and whether http:// links are hidden; those articles drop
	// out of every list.
	let hiddenTypes: string[] = $state([]);
	let hideHttp = $state(false);
	let sourceTypesOpen = $state(false);
	const sourceTypeOptions = $derived(SOURCE_TYPES.filter((t) => data.articles.some((e) => e.type === t)).sort());
	const shown = (e: { type: string; secure: boolean }) => sourceVisible(e, hiddenTypes, hideHttp);

	function toggleSourceType(type: string) {
		hiddenTypes = hiddenTypes.includes(type) ? hiddenTypes.filter((t) => t !== type) : [...hiddenTypes, type];
		saveHiddenTypes(hiddenTypes);
	}

	function toggleHideHttp() {
		hideHttp = !hideHttp;
		saveHideHttp(hideHttp);
	}

	// Sidebar sections, top to bottom. Products are nested under manufacturers, not listed on their own.
	const SECTIONS: { label: string; keys: FilterKey[] }[] = [
		{ label: 'Instrument', keys: ['manufacturers'] },
		{ label: 'Module', keys: ['modules'] },
		{ label: 'Electronics', keys: ['subcircuits', 'functions', 'components'] },
		{ label: 'Resource', keys: ['kind', 'authors', 'confidence'] }
	];
	// Long lists show the most used first and hide the rest behind "Show all".
	const TOP_N = 8;
	let showAll: Record<string, boolean> = $state({});
	// Nested groups and manufacturers the reader unfolded (or that hold an active filter).
	let openSub: Record<string, boolean> = $state({});

	const count = (key: FilterKey, id: string) => facetCounts[key].get(id) ?? 0;

	/** Alphabetical by label ("TR-606" before "TR-808"). */
	const byLabel = (a: { label: string }, b: { label: string }) =>
		a.label.localeCompare(b.label, 'en', { numeric: true, sensitivity: 'base' });

	/**
	 * All options of a filter, alphabetically. Options without matches stay in place (greyed out),
	 * so nothing moves when a filter is ticked.
	 */
	function visibleOptions(key: FilterKey, list: Option[]) {
		return [...list].sort(byLabel);
	}

	function groupOf(key: FilterKey, o: Option) {
		return key === 'components' ? COMPONENT_CATEGORY_GROUP[o.category ?? 'other'] : o.group;
	}

	/** Grouped filters: groups in their fixed order, each with its visible options. */
	function groupsOf(key: FilterKey) {
		const groups = TERM_GROUPS[key as keyof typeof TERM_GROUPS] ?? [];
		return groups
			.map((g) => ({ ...g, options: visibleOptions(key, options[key].filter((o) => groupOf(key, o) === g.id)) }))
			.filter((g) => g.options.length)
			.sort(byLabel);
	}

	const productsOf = (manufacturer: string) =>
		visibleOptions('products', options.products.filter((p) => p.manufacturer === manufacturer));

	onMount(() => {
		const params = new URLSearchParams(location.search);
		query = params.get('q') ?? '';
		filters = filtersFromParams(params);
		for (const key of FILTER_KEYS) if (filters[key].length) openGroups[key] = true;
		if (query) warmSearch();
		hiddenTypes = loadHiddenTypes();
		hideHttp = loadHideHttp();
		if (hiddenTypes.length || hideHttp) sourceTypesOpen = true;
		// Open the manufacturer of a selected product, and the groups holding selected terms.
		for (const id of filters.products) {
			const m = options.products.find((p) => p.id === id)?.manufacturer;
			if (m) openSub[`manufacturers:${m}`] = true;
		}
		for (const id of filters.manufacturers) openSub[`manufacturers:${id}`] = true;
		// Open FX (or any module with subtypes) when it or one of its subtypes is selected.
		for (const id of filters.modules) {
			const parent = options.modules.find((t) => t.id === id)?.parent ?? id;
			openSub[`modules:${parent}`] = true;
		}
		if (filters.products.length) openGroups.manufacturers = true;
		for (const key of ['subcircuits', 'functions', 'components'] as FilterKey[]) {
			for (const id of filters[key]) {
				const o = options[key].find((t) => t.id === id);
				if (o) openSub[`${key}:${groupOf(key, o)}`] = true;
			}
		}
		try {
			const saved = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]');
			if (Array.isArray(saved)) recent = saved.filter((r) => FILTER_KEYS.includes(r?.key) && typeof r?.id === 'string');
		} catch {
			// No storage (private mode, blocked): the row just stays empty.
		}
	});

	function syncUrl() {
		const params = filtersToParams(filters, query.trim(), data.parents).toString();
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
		const adding = !list.includes(id);
		filters[key] = adding ? [...list, id] : list.filter((v) => v !== id);
		if (adding) remember(key, id);
		syncUrl();
	}

	/**
	 * A child was clicked while its "All" row (the parent) is ticked: the children only look
	 * ticked, so switch the filter from the whole group to just this child.
	 */
	function narrowTo(parent: { key: FilterKey; id: string }, key: FilterKey, id: string) {
		filters[parent.key] = filters[parent.key].filter((v) => v !== parent.id);
		if (!filters[key].includes(id)) filters[key] = [...filters[key], id];
		remember(key, id);
		syncUrl();
	}

	function remember(key: FilterKey, id: string) {
		recent = [{ key, id }, ...recent.filter((r) => r.key !== key || r.id !== id)].slice(0, RECENT_MAX);
		try {
			localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
		} catch {
			// Not persisted; still works for this visit.
		}
	}

	function clearAll() {
		filters = emptyFilters();
		query = '';
		syncUrl();
	}

	function clearQuery() {
		query = '';
		syncUrl();
	}

	// One removable chip per active filter, e.g. "LM13700".
	const activeChips = $derived(
		FILTER_KEYS.flatMap((key) => filters[key].map((id) => ({ key, id, label: labels.get(id) ?? id })))
	);

	const facetMatch = $derived(matchingIds(facetIndex, filters));
	const q = $derived(query.trim());

	const results = $derived.by(() => {
		const allowed = (id: string) => (facetMatch === null || facetMatch.has(id)) && shown(byId.get(id)!);
		if (!q) return data.articles.filter((e) => allowed(e.id));
		if (searcher) {
			return searcher(q)
				.filter((r) => byId.has(r.id) && allowed(r.id))
				.map((r) => byId.get(r.id)!);
		}
		// Until Fuse is loaded: plain substring match, so typing never shows an empty page.
		const needle = q.toLowerCase();
		return data.articles.filter(
			(e) => allowed(e.id) && (e.title.toLowerCase().includes(needle) || e.summary.toLowerCase().includes(needle))
		);
	});

	const isFiltering = $derived(q !== '' || activeCount(filters) > 0);
	// Count for the results bar: visible articles of the matching or all articles.
	const shownCount = $derived(isFiltering ? results.length : data.articles.filter(shown).length);

	const IC_CATEGORY_LABEL: Record<string, string> = {
		ota: 'OTA',
		vca: 'VCA',
		opamp: 'op-amp',
		dac: 'DAC',
		mcu: 'microcontroller',
		'transistor-array': 'transistor array',
		optical: 'optical',
		magnetic: 'magnetic'
	};
	// Facts about a single selected component or IC, with a link to its page.
	const icInfo = $derived(
		filters.components.length === 1 ? options.components.find((t) => t.id === filters.components[0]) : undefined
	);

	let searchFocused = $state(false);
	const showRecent = $derived(searchFocused && q === '' && recent.length > 0);

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
	<link rel="canonical" href={data.canonical} />
	<meta
		name="description"
		content="Curated index of papers, datasheets and build logs on synthesizer circuits (analog, digital, mixed), searchable by subcircuit, function and IC."
	/>
</svelte:head>

<p class="intro">
	A curated index of articles, schematics, videos and papers on synthesizer circuits:
	{data.articles.length} resources by {data.terms.authors.length} authors. 
  Every result links straight to the original.
</p>

<search class="searchbar">
	<label class="visually-hidden" for="q">Search</label>
	<input
		id="q"
		type="search"
		placeholder="Search: MS-20, LM13700, soft clipping, buffer …"
		autocomplete="off"
		aria-controls={showRecent ? 'recent' : undefined}
		bind:value={query}
		onfocus={() => {
			warmSearch();
			searchFocused = true;
		}}
		onblur={() => (searchFocused = false)}
		oninput={syncUrl}
	/>
	<!-- Recent filters as suggestions while the empty search field has focus. -->
	{#if showRecent}
		<div class="suggest" id="recent" role="group" aria-label="Recently used filters">
			<span class="status">Recent filters</span>
			<ul class="chips">
				{#each recent as r (r.key + r.id)}
					<li>
						<!-- mousedown keeps focus in the field, so the list stays open for several picks -->
						<button
							class="chip"
							aria-pressed={filters[r.key].includes(r.id)}
							onmousedown={(e) => e.preventDefault()}
							onclick={() => toggle(r.key, r.id)}>{labels.get(r.id) ?? r.id}</button
						>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
	{#if searchFailed}<span class="muted">Search index unavailable, using simple matching.</span>{/if}
</search>

<!-- Always shown, so ticking a filter doesn't push the page down. -->
<div class="active" aria-label="Active filters" aria-live="polite">
	<span class="status">{shownCount} {shownCount === 1 ? 'article' : 'articles'}</span>
	<ul class="chips">
		{#if q}
			<li>
				<button class="chip remove" onclick={clearQuery} aria-label="Remove search “{q}”">“{q}” <span aria-hidden="true">×</span></button>
			</li>
		{/if}
		{#each activeChips as c (c.key + c.id)}
			<li>
				<button class="chip remove" onclick={() => toggle(c.key, c.id)} aria-label="Remove filter {c.label}"
					>{c.label} <span aria-hidden="true">×</span></button
				>
			</li>
		{/each}
	</ul>
	{#if isFiltering}
		<button class="link" onclick={clearAll}>Clear all</button>
	{:else}
		<span class="status">Tick filters on the left or search above.</span>
	{/if}
</div>

<button class="filters-toggle" aria-expanded={showFilters} onclick={() => (showFilters = !showFilters)}>
	Filters{activeCount(filters) ? ` (${activeCount(filters)})` : ''}
</button>

<div class="layout">
	<aside aria-label="Filters" class:open={showFilters}>
		<!-- `parent`: the "All" row of this child's group; while it's ticked, the child shows as ticked too. -->
		{#snippet checkbox(key: FilterKey, o: Option, parent?: { key: FilterKey; id: string })}
			{@const implied = !!parent && filters[parent.key].includes(parent.id)}
			{@const checked = implied || filters[key].includes(o.id)}
			<!-- No matches with the current filters: stays in place, greyed out and not clickable. -->
			{@const empty = !checked && count(key, o.id) === 0}
			<label class:implied class:empty>
				<input
					type="checkbox"
					{checked}
					disabled={empty}
					onchange={(e) => {
						if (!implied) return toggle(key, o.id);
						narrowTo(parent!, key, o.id);
						// It showed ticked before (via "All") and is ticked after, so Svelte sees no change
						// and wouldn't undo the browser's untick.
						e.currentTarget.checked = true;
					}}
				/>
				{o.label} <span class="muted">{count(key, o.id)}</span>
			</label>
		{/snippet}

		<!-- `first` renders an extra checkbox at the top of the same list (the "All" row of a maker). -->
		{#snippet list(
			key: FilterKey,
			id: string,
			opts: Option[],
			first?: import('svelte').Snippet,
			parent?: { key: FilterKey; id: string }
		)}
			{@const all = showAll[id] || opts.length <= TOP_N + 2}
			<ul>
				{#if first}<li>{@render first()}</li>{/if}
				{#each all ? opts : opts.slice(0, TOP_N) as o (o.id)}
					<li>{@render checkbox(key, o, parent)}</li>
				{/each}
			</ul>
			{#if !all}
				<button class="link more" onclick={() => (showAll[id] = true)}>Show all ({opts.length})</button>
			{/if}
		{/snippet}

		<!-- A parent term (manufacturer, FX) with its children: same look as the subcircuit/function
		     groups, a fold row, then "All" (the parent itself) and the children inside. -->
		{#snippet parentGroup(key: FilterKey, m: Option, childKey: FilterKey, children: Option[])}
			{@const sel = (filters[key].includes(m.id) ? 1 : 0) + children.filter((c) => filters[childKey].includes(c.id)).length}
			<details
				class="group"
				open={openSub[`${key}:${m.id}`] ?? false}
				ontoggle={(e) => (openSub[`${key}:${m.id}`] = (e.currentTarget as HTMLDetailsElement).open)}
			>
				<summary class:empty={!sel && count(key, m.id) === 0}
					>{m.label} <span class="muted">{sel ? `${sel} selected` : count(key, m.id)}</span></summary
				>
				{#snippet allRow()}
					{@render checkbox(key, { ...m, label: children.length ? 'All' : m.label })}
				{/snippet}
				{@render list(childKey, `${childKey}:${m.id}`, children, allRow, { key, id: m.id })}
			</details>
		{/snippet}

		{#snippet facet(key: FilterKey, body: import('svelte').Snippet)}
			<details
				open={openGroups[key] ?? false}
				ontoggle={(e) => (openGroups[key] = (e.currentTarget as HTMLDetailsElement).open)}
			>
				<summary>{FACET_LABEL[key]}{filters[key].length ? ` (${filters[key].length})` : ''}</summary>
				{@render body()}
			</details>
		{/snippet}

		{#each SECTIONS as section (section.label)}
			<h3 class="section">{section.label}</h3>
			{#each section.keys as key (key)}
				{#if key === 'manufacturers'}
					{@const makers = visibleOptions(key, options[key])}
					{#if makers.length}
						{#snippet makerList()}
							{@const all = showAll.manufacturers || makers.length <= TOP_N + 2}
							{#each all ? makers : makers.slice(0, TOP_N) as m (m.id)}
								{@render parentGroup(key, m, 'products', productsOf(m.id))}
							{/each}
							{#if !all}
								<button class="link more" onclick={() => (showAll.manufacturers = true)}>Show all ({makers.length})</button>
							{/if}
						{/snippet}
						{@render facet(key, makerList)}
					{/if}
				{:else if key === 'modules'}
					<!-- Modules: plain rows, except those with subtypes (FX), which fold like a manufacturer. -->
					<!-- Modules with subtypes (FX) come first, then the rest; each part alphabetically. -->
					{@const hasSubs = (id: string) => options[key].some((o) => o.parent === id)}
					{@const mods = visibleOptions(key, options[key].filter((o) => !o.parent)).sort(
						(a, b) => Number(hasSubs(b.id)) - Number(hasSubs(a.id))
					)}
					{#if mods.length}
						{#snippet moduleList()}
							<ul class="grow">
								{#each mods as m (m.id)}
									{@const subs = visibleOptions(key, options[key].filter((o) => o.parent === m.id))}
									<li>
										{#if subs.length}
											{@render parentGroup(key, m, key, subs)}
										{:else}
											{@render checkbox(key, m)}
										{/if}
									</li>
								{/each}
							</ul>
						{/snippet}
						{@render facet(key, moduleList)}
					{/if}
				{:else if key === 'subcircuits' || key === 'functions' || key === 'components'}
					{@const groups = groupsOf(key)}
					{#if groups.length}
						{#snippet groupList()}
							{#each groups as g (g.id)}
								{@const sel = g.options.filter((o) => filters[key].includes(o.id)).length}
								<details
									class="group"
									open={openSub[`${key}:${g.id}`] ?? false}
									ontoggle={(e) => (openSub[`${key}:${g.id}`] = (e.currentTarget as HTMLDetailsElement).open)}
								>
									<summary class:empty={!sel && g.options.every((o) => count(key, o.id) === 0)}
										>{g.label} <span class="muted">{sel ? `${sel} selected` : g.options.length}</span></summary
									>
									{@render list(key, `${key}:${g.id}`, g.options)}
								</details>
							{/each}
						{/snippet}
						{@render facet(key, groupList)}
					{/if}
				{:else}
					{@const opts = visibleOptions(key, options[key])}
					{#if opts.length}
						{#snippet flatList()}
							{@render list(key, key, opts)}
						{/snippet}
						{@render facet(key, flatList)}
					{/if}
				{/if}
			{/each}
			{#if section.label === 'Resource' && sourceTypeOptions.length > 1}
				<details
					open={sourceTypesOpen}
					ontoggle={(e) => (sourceTypesOpen = (e.currentTarget as HTMLDetailsElement).open)}
				>
					<summary
						>Source types{hiddenTypes.length + (hideHttp ? 1 : 0) ? ` (${hiddenTypes.length + (hideHttp ? 1 : 0)} hidden)` : ''}</summary
					>
					<ul>
						{#each sourceTypeOptions as t (t)}
							<li>
								<label>
									<input type="checkbox" checked={!hiddenTypes.includes(t)} onchange={() => toggleSourceType(t)} />
									{t} <span class="muted">{results.filter((e) => e.type === t).length}</span>
								</label>
							</li>
						{/each}
					</ul>
					<label class="http">
						<input type="checkbox" checked={hideHttp} onchange={toggleHideHttp} />
						Hide non-https links
					</label>
					<p class="hint">
						Many older sites still use http://. They're often excellent resources, so they're shown by default.
						<strong>Never enter a password or personal data on an http:// site:</strong> it's sent unencrypted.
					</p>
				</details>
			{/if}
		{/each}
	</aside>

	<section>
		<!-- Inside the results column, so the sidebar doesn't move when it appears. -->
		{#if icInfo}
			<p class="ic-info">
				<strong>{icInfo.label}</strong>
				{[IC_CATEGORY_LABEL[icInfo.category ?? ''] ?? icInfo.category, icInfo.manufacturer, icInfo.status].filter(Boolean).join(' · ')}
				{#if icInfo.datasheetUrl}
					· <a href={icInfo.datasheetUrl} target="_blank" rel="noopener external" data-out="datasheet">Datasheet ↗</a>
				{/if}
				{#if icInfo.alternatives?.length}
					· Alternatives: {icInfo.alternatives.map((id) => labels.get(id) ?? id).join(', ')}
				{/if}
				· <a href={resolve('/[type=node]/[...path]', { type: 'component', path: icInfo.id })}>About {icInfo.label} →</a>
			</p>
		{/if}
		{#if isFiltering}
			{#if results.length}
				<ArticleList articles={results} {labels} parents={data.parents} {hiddenTypes} {hideHttp} />
			{:else}
				<p class="muted">No article matches. Remove a filter or try a broader term.</p>
			{/if}
		{:else}
			<h2>Recent articles</h2>
			<ArticleList articles={data.articles} {labels} parents={data.parents} {hiddenTypes} {hideHttp} limit={10} />

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
	.intro {
		max-width: 44rem;
		margin: var(--space-3) 0 0;
		color: var(--muted);
		font-size: 0.95rem;
		line-height: 1.5;
	}

	.searchbar {
		position: relative;
		display: block;
		margin: var(--space-3) 0 var(--space-2);
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

	.suggest {
		position: absolute;
		z-index: 2;
		top: calc(100% + 2px);
		left: 0;
		right: 0;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-1) var(--space-2);
		padding: var(--space-2) var(--space-3);
		background: var(--panel);
		border: 1px solid var(--line);
		border-radius: 4px;
		box-shadow: 0 4px 12px rgb(0 0 0 / 0.25);
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

	/* Active filters: own block between search and results */
	.active {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		/* one chip row tall even when empty, so the bar never changes height for the first filter */
		min-height: 2.9rem;
		gap: var(--space-1) var(--space-2);
		padding: var(--space-2) var(--space-3);
		margin-bottom: var(--space-4);
		background: var(--panel);
		border: 1px solid var(--line);
		border-radius: 4px;
	}

	.chip.remove {
		border-color: var(--accent);
	}

	.chip.remove span {
		margin-left: 0.2rem;
		color: var(--muted);
	}

	.chip.remove:hover span {
		color: var(--bad);
	}

	.ic-info {
		margin: 0 0 var(--space-2);
		font-size: 0.9rem;
		color: var(--muted);
	}

	.status {
		color: var(--muted);
		font-size: 0.9rem;
	}

	.layout {
		display: grid;
		grid-template-columns: 18rem 1fr;
		gap: var(--space-5);
		border-top: 1px solid var(--line);
		padding-top: var(--space-3);
	}

	aside {
		font-size: 0.9rem;
	}

	details {
		border-bottom: 1px solid var(--line);
		padding: var(--space-2) 0;
	}

	.section {
		margin: var(--space-4) 0 var(--space-1);
		font-size: 0.75rem;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--muted);
	}

	.section:first-child {
		margin-top: 0;
	}

	/* Lists holding foldable groups grow instead of scrolling inside the sidebar. */
	aside ul.grow {
		max-height: none;
	}

	details.group {
		border-bottom: 0;
		padding: 0.15rem 0 0 0.6rem;
	}

	details.group summary {
		font-weight: 400;
	}

	details.group summary .muted {
		font-family: var(--mono);
		font-size: 0.8rem;
	}









	.link.more {
		margin: 0.2rem 0 0;
		font-size: 0.85rem;
	}

	label.http {
		margin-top: var(--space-2);
	}

	.hint {
		margin: 0.2rem 0 0;
		font-size: 0.8rem;
		color: var(--muted);
	}

	summary {
		cursor: pointer;
		font-weight: 600;
	}

	aside ul {
		list-style: none;
		padding: 0;
		margin: var(--space-2) 0 0;
		max-height: 16rem;
		overflow-y: auto;
	}

	aside label {
		display: flex;
		gap: 0.4rem;
		align-items: baseline;
		cursor: pointer;
		padding: 0.1rem 0;
	}

	/* No matches with the current filters: kept in place so the list doesn't shift. */
	aside label.empty,
	aside summary.empty {
		opacity: 0.45;
		cursor: default;
	}

	aside label .muted {
		margin-left: auto;
		font-family: var(--mono);
		font-size: 0.8rem;
	}

	section > h2:first-child {
		margin-top: 0;
	}

	.link {
		background: none;
		border: 0;
		padding: 0;
		margin-left: auto;
		color: var(--accent);
		font: inherit;
		font-size: 0.9rem;
		text-decoration: underline;
		cursor: pointer;
	}

	.filters-toggle {
		display: none;
	}

	@media (max-width: 45rem) {
		.layout {
			grid-template-columns: 1fr;
			gap: var(--space-3);
		}

		.filters-toggle {
			display: block;
			width: 100%;
			margin-bottom: var(--space-3);
			padding: var(--space-2);
			font: inherit;
			font-weight: 600;
			background: var(--panel);
			color: var(--fg);
			border: 1px solid var(--line);
			border-radius: 4px;
			cursor: pointer;
		}

		aside {
			display: none;
		}

		aside.open {
			display: block;
		}
	}
</style>
