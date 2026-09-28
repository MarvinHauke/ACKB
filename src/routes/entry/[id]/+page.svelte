<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { loadHiddenTypes, loadHideHttp, saveHiddenTypes, saveHideHttp, sourceVisible } from '$lib/source-types';
	import { KIND_LABEL, REGISTRY_KEYS, REGISTRY_META } from '$lib/types';

	let { data } = $props();
	const entry = $derived(data.entry);

	// Source types / http links hidden in the home page filters; read after hydration, so the prerendered page lists all.
	let hiddenTypes: string[] = $state([]);
	let hideHttp = $state(false);
	onMount(() => {
		hiddenTypes = loadHiddenTypes();
		hideHttp = loadHideHttp();
	});
	const secure = (url: string) => url.startsWith('https://');
	const visibleSources = $derived(
		entry.sources.filter((s) => sourceVisible({ type: s.type, secure: secure(s.url) }, hiddenTypes, hideHttp))
	);
	const hiddenSources = $derived(entry.sources.filter((s) => !visibleSources.includes(s)));
	// What the note names: the hidden types, plus "http" when links are hidden only for that reason.
	const hiddenReasons = $derived([
		...new Set(hiddenSources.map((s) => (hiddenTypes.includes(s.type) ? s.type : 'http')))
	]);

	function showHidden() {
		hiddenTypes = hiddenTypes.filter((t) => !hiddenReasons.includes(t));
		saveHiddenTypes(hiddenTypes);
		if (hiddenReasons.includes('http')) {
			hideHttp = false;
			saveHideHttp(false);
		}
	}

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
	<p class="badge">{entry.kinds.map((k) => KIND_LABEL[k]).join(' · ')} · {entry.confidence} · added {entry.added}{entry.reviewed ? ` · reviewed ${entry.reviewed}` : ''}</p>
	<h1>{entry.title}</h1>
	<p class="summary">{entry.summary}</p>


	<h2>Resources</h2>
	<ul class="sources">
		{#each visibleSources as s (s.url)}
			<li>
				<span class="badge type">{s.type}</span>
				<div>
					<a href={s.url} data-out={s.type} rel="noopener external">{s.title}</a>
					<span class="host mono">{new URL(s.url).hostname.replace(/^www\./, '')}</span>
					{#if !secure(s.url)}
						<span class="insecure" title="Unencrypted http:// site. Fine for reading; never enter a password or personal data there."
							>http</span
						>
					{/if}
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
	{#if hiddenSources.length}
		{@const n = hiddenSources.length}
		<p class="hidden-note muted">
			{n} {hiddenReasons.join('/')} {n === 1 ? 'source' : 'sources'} hidden by your filters.
			<button class="link" onclick={showHidden}>Show</button>
		</p>
	{/if}

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

	<h2>Tags</h2>
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
		margin: 0 0 1.5rem;
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

	.insecure {
		margin-left: 0.4rem;
		padding: 0 0.3rem;
		font-size: 0.75rem;
		border: 1px solid var(--warn);
		border-radius: 3px;
		color: var(--warn);
	}

	.hidden-note {
		font-size: 0.88rem;
	}

	.link {
		background: none;
		border: 0;
		padding: 0;
		color: var(--accent);
		font: inherit;
		text-decoration: underline;
		cursor: pointer;
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
