<script lang="ts">
	import { resolve } from '$app/paths';
	import { REGISTRY_KEYS, REGISTRY_META } from '$lib/types';

	let { data } = $props();
	const entry = $derived(data.entry);

	const STATUS_TEXT: Record<string, string> = {
		broken: 'link broken',
		timeout: 'link timed out',
		blocked: 'site blocks link checks',
		redirect: 'redirects'
	};

	const jsonLd = $derived(
		JSON.stringify({
			'@context': 'https://schema.org',
			'@type': 'TechArticle',
			headline: entry.title,
			description: entry.summary,
			dateCreated: entry.added,
			...(entry.reviewed ? { dateModified: entry.reviewed } : {}),
			proficiencyLevel: entry.difficulty,
			keywords: REGISTRY_KEYS.flatMap((k) => entry.terms[k].map((t) => t.label)).join(', '),
			citation: entry.sources.map((s) => ({ '@type': 'CreativeWork', name: s.title, url: s.url, author: s.author }))
		}).replace(/</g, '\\u003c')
	);
</script>

<svelte:head>
	<title>{entry.title} · ACKB</title>
	<meta name="description" content={entry.summary} />
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- JSON-LD from our own data, '<' escaped -->
	{@html `<script type="application/ld+json">${jsonLd}</script>`}
</svelte:head>

<article>
	<p class="badge">{entry.confidence} · {entry.difficulty} · added {entry.added}{entry.reviewed ? ` · reviewed ${entry.reviewed}` : ''}</p>
	<h1>{entry.title}</h1>
	<p class="summary">{entry.summary}</p>

	<dl class="terms">
		{#each REGISTRY_KEYS as key (key)}
			{#if entry.terms[key].length}
				<dt>{entry.terms[key].length > 1 ? REGISTRY_META[key].plural : REGISTRY_META[key].label}</dt>
				<dd>
					<ul class="chips">
						{#each entry.terms[key] as t (t.id)}
							<li>
								<a class="chip" href={resolve('/[kind=taxonomy]/[id]', { kind: REGISTRY_META[key].slug, id: t.id })}
									>{t.label}</a
								>
							</li>
						{/each}
					</ul>
				</dd>
			{/if}
		{/each}
	</dl>

	<h2>Resources</h2>
	<ul class="sources">
		{#each entry.sources as s (s.url)}
			<li>
				<span class="badge type">{s.type}</span>
				<div>
					<a href={s.url} data-out={s.type} rel="noopener external">{s.title}</a>
					<span class="host mono">{new URL(s.url).hostname.replace(/^www\./, '')}</span>
					{#if STATUS_TEXT[s.status]}
						<span class="status status-{s.status}">{STATUS_TEXT[s.status]}</span>
					{/if}
					{#if s.archiveUrl}
						<a class="archive" href={s.archiveUrl} data-out="archive" rel="noopener external">archived copy</a>
					{/if}
					<div class="meta muted">
						{[s.author, s.year, s.license, s.lang && s.lang !== 'en' ? s.lang.toUpperCase() : null].filter(Boolean).join(' · ')}
					</div>
					{#if s.note}<div class="note">{s.note}</div>{/if}
				</div>
			</li>
		{/each}
	</ul>

	{#if entry.related.length}
		<h2>Related entries</h2>
		<ul class="related">
			{#each entry.related as r (r.id)}
				<li>
					<a href={resolve('/entry/[id]', { id: r.id })}>{r.title}</a>
					<span class="muted">shares {r.reasons.join(', ')}</span>
				</li>
			{/each}
		</ul>
	{/if}
</article>

<style>
	article {
		max-width: 46rem;
	}

	.summary {
		font-size: 1.05rem;
	}

	.terms {
		display: grid;
		grid-template-columns: max-content 1fr;
		gap: 0.45rem 1rem;
		margin: 1.5rem 0;
	}

	dt {
		color: var(--muted);
		font-size: 0.9rem;
	}

	dd {
		margin: 0;
	}

	.sources,
	.related {
		list-style: none;
		padding: 0;
	}

	.sources li {
		display: grid;
		grid-template-columns: 6rem 1fr;
		gap: 0.75rem;
		padding: 0.6rem 0;
		border-bottom: 1px solid var(--line);
	}

	.type {
		padding-top: 0.2rem;
	}

	.host {
		color: var(--muted);
		margin-left: 0.4rem;
		font-size: 0.8rem;
	}

	.meta,
	.note {
		font-size: 0.88rem;
	}

	.note {
		margin-top: 0.15rem;
	}

	.status {
		font-size: 0.8rem;
		margin-left: 0.4rem;
		color: var(--warn);
	}

	.status-broken {
		color: var(--bad);
	}

	.archive {
		font-size: 0.85rem;
		margin-left: 0.4rem;
	}

	.related li {
		padding: 0.3rem 0;
	}

	.related .muted {
		display: block;
		font-size: 0.85rem;
	}

	@media (max-width: 30rem) {
		.terms {
			grid-template-columns: 1fr;
			gap: 0.2rem;
		}

		dd {
			margin-bottom: 0.5rem;
		}

		.sources li {
			grid-template-columns: 1fr;
			gap: 0.1rem;
		}
	}
</style>
