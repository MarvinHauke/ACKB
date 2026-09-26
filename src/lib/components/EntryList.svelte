<script lang="ts">
	import { resolve } from '$app/paths';
	import type { EntrySummary } from '$lib/types';

	let { entries, labels }: { entries: EntrySummary[]; labels: Map<string, string> } = $props();
</script>

<ol class="entries">
	{#each entries as entry (entry.id)}
		<li>
			<a class="title" href={resolve('/entry/[id]', { id: entry.id })}>{entry.title}</a>
			<span class="badge">{entry.confidence} · {entry.difficulty}</span>
			<p>{entry.summary}</p>
			<ul class="chips">
				{#each [...entry.terms.products, ...entry.terms.ics, ...entry.terms.subcircuits.slice(0, 3)] as id (id)}
					<li class="chip">{labels.get(id) ?? id}</li>
				{/each}
			</ul>
		</li>
	{/each}
</ol>

<style>
	.entries {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.entries > li {
		padding: 0.8rem 0;
		border-bottom: 1px solid var(--line);
	}

	.title {
		font-weight: 600;
		margin-right: 0.6rem;
	}

	p {
		margin: 0.25rem 0 0.45rem;
		color: var(--muted);
		font-size: 0.93rem;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
