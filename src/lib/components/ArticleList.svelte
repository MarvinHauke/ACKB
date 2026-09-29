<script lang="ts">
	// One row per article: the title links straight to the resource in a new tab; tag chips open
	// the tag pages (/component/ca3080); "Details" opens the article page with related articles.
	import { resolve } from '$app/paths';
	import { sourceVisible } from '$lib/source-types';
	import { KIND_LABEL, REGISTRY_META, termPath, type ArticleSummary, type ParentMap, type RegistryKey } from '$lib/types';

	let {
		articles,
		labels,
		parents = {},
		hiddenTypes = [],
		hideHttp = false,
		hideCommunity = false,
		limit
	}: {
		articles: ArticleSummary[];
		labels: Map<string, string>;
		/** Parents of subtypes, for paths like /module/fx/delay. */
		parents?: ParentMap;
		hiddenTypes?: string[];
		hideHttp?: boolean;
		/** Leave out the default "community" confidence label (tag pages only). */
		hideCommunity?: boolean;
		/** Show at most this many articles (e.g. the "Recent" list). */
		limit?: number;
	} = $props();

	const rows = $derived.by(() => {
		const all = articles.filter((a) => sourceVisible(a, hiddenTypes, hideHttp));
		return limit === undefined ? all : all.slice(0, limit);
	});

	const CHIP_KEYS: RegistryKey[] = ['products', 'components', 'subcircuits'];
	/** Up to a few tags per row, each linking to its tag page. */
	function chips(a: ArticleSummary) {
		return CHIP_KEYS.flatMap((key) =>
			(key === 'subcircuits' ? a.terms[key].slice(0, 3) : a.terms[key]).map((id) => ({
				id,
				label: labels.get(id) ?? id,
				href: resolve('/[type=node]/[...path]', { type: REGISTRY_META[key].slug, path: termPath(id, parents[`${key}:${id}`]) })
			}))
		);
	}

	const host = (url: string) => new URL(url).hostname.replace(/^www\./, '');
	const authorsOf = (a: ArticleSummary) => a.terms.authors.map((id) => labels.get(id) ?? id).join(', ');
</script>

<ol class="articles">
	{#each rows as a (a.id)}
		<li>
			<a class="title" href={a.url} target="_blank" rel="noopener external" data-out={a.type}
				>{a.title}<span class="out" aria-hidden="true"> ↗</span><span class="visually-hidden"> (opens in a new tab)</span></a
			>
			<span class="host mono">{host(a.url)}</span>
			{#if !a.secure}
				<span class="insecure" title="Unencrypted http:// site. Fine for reading; never enter a password or personal data there."
					>http</span
				>
			{/if}
			<div class="badge">
				{[a.type, ...a.kinds.filter((k) => k !== a.type).map((k) => KIND_LABEL[k]), ...(hideCommunity && a.confidence === 'community' ? [] : [a.confidence])].join(' · ')}{a.terms.authors
					.length
					? ` · ${authorsOf(a)}`
					: ''}
			</div>
			<p>{a.summary}</p>
			<div class="foot">
				<ul class="chips">
					{#each chips(a) as c (c.id)}
						<li><a class="chip" href={c.href}>{c.label}</a></li>
					{/each}
				</ul>
				<a class="details" href={resolve('/article/[id]', { id: a.id })}>Details →</a>
			</div>
		</li>
	{/each}
</ol>

<style>
	.articles {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.articles > li {
		padding: 0.8rem 0;
		border-bottom: 1px solid var(--line);
	}

	.title {
		font-weight: 600;
	}

	.out {
		font-weight: 400;
		color: var(--muted);
	}

	.host {
		margin-left: 0.5rem;
		font-size: 0.8rem;
		color: var(--muted);
	}

	.insecure {
		margin-left: 0.4rem;
		padding: 0 0.3rem;
		font-size: 0.75rem;
		border: 1px solid var(--warn);
		border-radius: 3px;
		color: var(--warn);
	}

	.badge {
		margin-top: 0.15rem;
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

	.foot {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.4rem 1rem;
	}

	a.chip {
		text-decoration: none;
		color: inherit;
	}

	.details {
		margin-left: auto;
		font-size: 0.88rem;
	}
</style>
