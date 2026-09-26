<script lang="ts">
	import { resolve } from '$app/paths';
	import EntryList from '$lib/components/EntryList.svelte';

	let { data } = $props();
	const term = $derived(data.term);
	const labels = $derived(new Map(Object.entries(data.labels)));
	const termHref = (id: string) => resolve('/[kind=taxonomy]/[id]', { kind: data.meta.slug, id });
	// Home page pre-filtered by this term, to combine it with other filters.
	const filterHref = $derived(`${resolve('/')}?${data.meta.slug}=${encodeURIComponent(term.id)}`);
</script>

<svelte:head>
	<title>{term.label} · {data.meta.label} · ACKB</title>
	<meta
		name="description"
		content={term.description ?? `${data.entries.length} curated resources on ${term.label} in synthesizer circuits.`}
	/>
</svelte:head>

<p class="badge">
	<a href={resolve('/')}>Filters</a> / {data.meta.plural}{#if data.parent}
		/ <a href={termHref(data.parent.id)}>{data.parent.label}</a>{/if}
</p>
<h1>{term.label}</h1>

{#if term.description}<p>{term.description}</p>{/if}

<dl class="facts">
	{#if term.aliases?.length}
		<dt>Also known as</dt>
		<dd>{term.aliases.join(', ')}</dd>
	{/if}
	{#if data.manufacturer}
		<dt>Manufacturer</dt>
		<dd><a href={resolve('/[kind=taxonomy]/[id]', { kind: 'manufacturer', id: data.manufacturer.id })}>{data.manufacturer.label}</a></dd>
	{:else if term.manufacturer}
		<dt>Manufacturer</dt>
		<dd>{term.manufacturer}</dd>
	{/if}
	{#if term.year}
		<dt>Year</dt>
		<dd>{term.year}</dd>
	{/if}
	{#if term.category}
		<dt>Category</dt>
		<dd>{term.category}{term.status ? ` · ${term.status}` : ''}</dd>
	{/if}
	{#if term.datasheetUrl}
		<dt>Datasheet</dt>
		<dd><a href={term.datasheetUrl} data-out="datasheet" rel="noopener external">{new URL(term.datasheetUrl).hostname}</a></dd>
	{/if}
	{#if data.alternatives.length}
		<dt>Alternatives</dt>
		<dd>
			{#each data.alternatives as alt, i (alt.id)}{i ? ', ' : ''}<a href={termHref(alt.id)}>{alt.label}</a>{/each}
		</dd>
	{/if}
	{#if data.children.length}
		<dt>Includes</dt>
		<dd>
			<ul class="chips">
				{#each data.children as c (c.id)}
					<li><a class="chip" href={termHref(c.id)}>{c.label} <span class="muted">{c.count}</span></a></li>
				{/each}
			</ul>
		</dd>
	{/if}
</dl>

<h2>{data.entries.length} {data.entries.length === 1 ? 'entry' : 'entries'}</h2>
<p><a href={filterHref}>Combine with other filters →</a></p>
<EntryList entries={data.entries} {labels} />

<style>
	.facts {
		display: grid;
		grid-template-columns: max-content 1fr;
		gap: 0.35rem 1rem;
	}

	dt {
		color: var(--muted);
	}

	dd {
		margin: 0;
	}
</style>
