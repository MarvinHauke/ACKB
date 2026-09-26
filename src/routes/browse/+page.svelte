<script lang="ts">
	import { resolve } from '$app/paths';

	let { data } = $props();
</script>

<svelte:head>
	<title>Browse · ACKB</title>
	<meta name="description" content="All manufacturers, products, circuit types, subcircuits, functions and ICs in the knowledge base." />
</svelte:head>

<h1>Browse</h1>

{#each data.groups as g (g.key)}
	<h2 id={g.meta.slug}>{g.meta.plural}</h2>
	<ul class="chips">
		{#each g.terms as t (t.id)}
			<li>
				<a class="chip" class:child={t.parent} href={resolve('/[kind=taxonomy]/[id]', { kind: g.meta.slug, id: t.id })}
					>{t.label} <span class="muted">{t.count}</span></a
				>
			</li>
		{/each}
	</ul>
{/each}

<style>
	.child {
		border-style: dashed;
	}
</style>
