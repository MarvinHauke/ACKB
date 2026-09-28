<script lang="ts">
	// One article (link): what it is, where it goes, its tags (edges to the tag pages) and related articles.
	import { resolve } from '$app/paths';
	import { KIND_LABEL, REGISTRY_KEYS, REGISTRY_META, termPath } from '$lib/types';

	let { data } = $props();
	const a = $derived(data.article);
	const secure = $derived(a.url.startsWith('https://'));
	const host = (url: string) => new URL(url).hostname.replace(/^www\./, '');
	const nodeHref = (key: (typeof REGISTRY_KEYS)[number], id: string) =>
		resolve('/[type=node]/[...path]', { type: REGISTRY_META[key].slug, path: termPath(id, data.parents[`${key}:${id}`]) });

	const STATUS_TEXT: Record<string, string> = {
		broken: 'link broken',
		timeout: 'link timed out',
		blocked: 'site blocks link checks',
		redirect: 'redirects'
	};

	// Tags without authors (shown in the byline) — the article's edges in the knowledge graph.
	const TAG_KEYS = REGISTRY_KEYS.filter((k) => k !== 'authors');

	const jsonLd = $derived(
		JSON.stringify({
			'@context': 'https://schema.org',
			'@type': 'CreativeWork',
			name: a.title,
			url: a.url,
			description: a.summary,
			...(a.year ? { dateCreated: String(a.year) } : {}),
			author: a.terms.authors.map((t) => ({ '@type': 'Person', name: t.label })),
			keywords: TAG_KEYS.flatMap((k) => a.terms[k].map((t) => t.label)).join(', ')
		}).replace(/</g, '\\u003c')
	);
</script>

<svelte:head>
	<title>{a.title} · ACKB</title>
	<meta name="description" content={a.summary} />
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- JSON-LD from our own data, '<' escaped -->
	{@html `<script type="application/ld+json">${jsonLd}</script>`}
</svelte:head>

<article>
	<p class="badge">
		{[a.type, ...a.kinds.filter((k) => k !== a.type).map((k) => KIND_LABEL[k]), a.confidence].join(' · ')} · added {a.added}{a.reviewed
			? ` · reviewed ${a.reviewed}`
			: ''}
	</p>
	<h1>{a.title}</h1>
	<p class="byline muted">
		{#each a.terms.authors as t, i (t.id)}{i ? ', ' : ''}<a href={nodeHref('authors', t.id)}>{t.label}</a>{/each}
		{[a.year, a.license, a.lang !== 'en' ? a.lang.toUpperCase() : null].filter(Boolean).map((x) => ` · ${x}`).join('')}
	</p>

	<p class="open">
		<a class="button" href={a.url} target="_blank" data-out={a.type} rel="noopener external"
			>Open {host(a.url)} <span aria-hidden="true">↗</span><span class="visually-hidden"> (opens in a new tab)</span></a
		>
		{#if !secure}
			<span class="insecure" title="Unencrypted http:// site. Fine for reading; never enter a password or personal data there."
				>http</span
			>
		{/if}
		{#if STATUS_TEXT[a.status]}
			<span class="status status-{a.status}">{STATUS_TEXT[a.status]}</span>
		{/if}
		{#if a.archiveUrl}
			<a class="archive" href={a.archiveUrl} target="_blank" data-out="archive" rel="noopener external">archived copy ↗</a>
		{/if}
	</p>
	{#if !secure}
		<p class="hint">
			This site uses unencrypted http://. It's fine for reading; never enter a password or personal data there.
		</p>
	{/if}

	<p class="summary">{a.summary}</p>

	<h2>Tags</h2>
	<dl class="terms">
		{#each TAG_KEYS as key (key)}
			{#if a.terms[key].length}
				<dt>{a.terms[key].length > 1 ? REGISTRY_META[key].plural : REGISTRY_META[key].label}</dt>
				<dd>
					<ul class="chips">
						{#each a.terms[key] as t (t.id)}
							<li><a class="chip" href={nodeHref(key, t.id)}>{t.label}</a></li>
						{/each}
					</ul>
				</dd>
			{/if}
		{/each}
	</dl>

	{#if data.related.length}
		<h2>Related articles</h2>
		<ul class="related">
			{#each data.related as r (r.id)}
				<li>
					<a href={r.url} target="_blank" rel="noopener external" data-out="related"
						>{r.title}<span class="out" aria-hidden="true"> ↗</span></a
					>
					<a class="details" href={resolve('/article/[id]', { id: r.id })}>Details</a>
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

	.byline {
		margin-top: -0.4rem;
	}

	.open {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
		margin: 1rem 0 0.4rem;
	}

	.button {
		display: inline-block;
		padding: 0.45rem 0.9rem;
		border: 1px solid var(--accent);
		border-radius: 4px;
		font-weight: 600;
		text-decoration: none;
	}

	.button:hover {
		background: var(--accent);
		color: var(--bg);
	}

	.summary {
		font-size: 1.05rem;
	}

	.hint {
		margin: 0 0 0.8rem;
		font-size: 0.85rem;
		color: var(--muted);
	}

	.terms {
		display: grid;
		grid-template-columns: max-content 1fr;
		gap: 0.45rem 1rem;
		margin: 0 0 1.5rem;
	}

	dt {
		color: var(--muted);
		font-size: 0.9rem;
	}

	dd {
		margin: 0;
	}

	.related {
		list-style: none;
		padding: 0;
	}

	.related li {
		padding: 0.3rem 0;
	}

	.related .muted {
		display: block;
		font-size: 0.85rem;
	}

	.details {
		margin-left: 0.5rem;
		font-size: 0.85rem;
	}

	.out {
		color: var(--muted);
	}

	.status {
		font-size: 0.8rem;
		color: var(--warn);
	}

	.status-broken {
		color: var(--bad);
	}

	.archive {
		font-size: 0.85rem;
	}

	.insecure {
		padding: 0 0.3rem;
		font-size: 0.75rem;
		border: 1px solid var(--warn);
		border-radius: 3px;
		color: var(--warn);
	}

	@media (max-width: 30rem) {
		.terms {
			grid-template-columns: 1fr;
			gap: 0.2rem;
		}

		dd {
			margin-bottom: 0.5rem;
		}
	}
</style>
