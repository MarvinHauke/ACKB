<script lang="ts">
	// Visible breadcrumb trail; the last item is the current page (no link).
	let { items }: { items: { label: string; href?: string }[] } = $props();
</script>

<nav class="crumbs" aria-label="Breadcrumb">
	<ol>
		{#each items as item, i (i)}
			<li>
				{#if item.href}<a href={item.href}>{item.label}</a>{:else}<span aria-current={i === items.length - 1 ? 'page' : undefined}>{item.label}</span>{/if}
			</li>
		{/each}
	</ol>
</nav>

<style>
	.crumbs {
		font-size: 0.8rem;
		color: var(--muted);
		margin: 0 0 0.4rem;
	}

	ol {
		display: flex;
		flex-wrap: wrap;
		gap: 0.1rem 0.4rem;
		list-style: none;
		margin: 0;
		padding: 0;
	}

	li + li::before {
		content: '›';
		margin-right: 0.4rem;
	}

	li {
		min-width: 0;
		overflow-wrap: anywhere;
	}

	a {
		color: var(--muted);
	}

	a:hover {
		color: var(--fg);
	}
</style>
