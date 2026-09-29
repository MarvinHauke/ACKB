<script lang="ts">
	// "Need the basics?": reference pages (data/references.json) on the same tags, folded by default.
	// General electronics, kept apart from the articles; links go straight out.
	import type { BasicsLink } from '$lib/types';

	let { links }: { links: BasicsLink[] } = $props();
</script>

{#if links.length}
	<details class="basics">
		<summary>Need the basics? <span class="muted">{links.length}</span></summary>
		<ul>
			{#each links as r (r.id)}
				<li>
					<a href={r.url} target="_blank" rel="noopener external" data-out="reference"
						>{r.title}<span class="out" aria-hidden="true"> ↗</span><span class="visually-hidden"> (opens in a new tab)</span></a
					>
					<span class="muted site">{r.siteName}</span>
					<p>{r.summary}</p>
				</li>
			{/each}
		</ul>
	</details>
{/if}

<style>
	.basics {
		margin: 1.2rem 0;
		padding: 0.5rem 0.8rem;
		border: 1px solid var(--line);
		border-radius: 4px;
	}

	summary {
		cursor: pointer;
		font-weight: 600;
	}

	ul {
		list-style: none;
		padding: 0;
		margin: 0.5rem 0 0;
	}

	li {
		padding: 0.4rem 0;
	}

	.site {
		margin-left: 0.4rem;
		font-size: 0.85rem;
	}

	.out {
		color: var(--muted);
	}

	p {
		margin: 0.15rem 0 0;
		color: var(--muted);
		font-size: 0.9rem;
	}
</style>
