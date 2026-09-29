// Build-time access to the generated catalog. Server-only: pages are prerendered, so this JSON
// never ships to the browser; each page gets only the slice its load function returns.
import raw from './generated/catalog.json';
import type { Article, ArticleSummary, BasicsLink, Catalog, ParentMap, ReferencePage, ReferenceTagKey, RegistryKey, Term } from '$lib/types';
import { REFERENCE_TAG_KEYS, REGISTRY_KEYS } from '$lib/types';

export const catalog = raw as unknown as Catalog;

export function summarize(a: Article): ArticleSummary {
	return {
		id: a.id,
		title: a.title,
		url: a.url,
		type: a.type,
		summary: a.summary,
		kinds: a.kinds,
		confidence: a.confidence,
		added: a.added,
		year: a.year,
		status: a.status,
		secure: a.url.startsWith('https://'),
		terms: Object.fromEntries(REGISTRY_KEYS.map((k) => [k, a.terms[k].map((t) => t.id)])) as Record<
			RegistryKey,
			string[]
		>
	};
}

export type FilterTerm = Pick<
	Term,
	| 'id'
	| 'label'
	| 'aliases'
	| 'count'
	| 'group'
	| 'parent'
	| 'manufacturer'
	| 'category'
	| 'status'
	| 'datasheetUrl'
	| 'alternatives'
>;

/** Only the terms at least one article uses, without descriptions: enough for the grouped filters. */
export function usedTerms(): Record<RegistryKey, FilterTerm[]> {
	return Object.fromEntries(
		REGISTRY_KEYS.map((k) => [
			k,
			catalog.taxonomy[k]
				.filter((t) => t.count > 0)
				.map(({ id, label, aliases, count, group, parent, manufacturer, category, status, datasheetUrl, alternatives }) => ({
					id,
					label,
					aliases,
					count,
					group,
					parent,
					manufacturer,
					category,
					status,
					datasheetUrl,
					alternatives
				}))
		])
	) as Record<RegistryKey, FilterTerm[]>;
}

/** Parents of every used subtype, for building paths like /module/fx/delay. */
export function termParents(): ParentMap {
	return Object.fromEntries(
		REGISTRY_KEYS.flatMap((k) =>
			catalog.taxonomy[k].flatMap((t) => (t.count && t.parent ? [[`${k}:${t.id}`, t.parent] as const] : []))
		)
	);
}

/** Labels of every used term, for chips on result rows. */
export function termLabels(): Record<string, string> {
	return Object.fromEntries(REGISTRY_KEYS.flatMap((k) => catalog.taxonomy[k].filter((t) => t.count).map((t) => [t.id, t.label])));
}

/**
 * Reference pages (data/references.json) that point to any of the given tags. They stay outside
 * the graph: nothing here feeds counts, related tags or search.
 */
export function referencePagesFor(tags: Partial<Record<ReferenceTagKey, Iterable<string>>>): BasicsLink[] {
	const sites = new Map(catalog.references.filter((r) => !r.site).map((r) => [r.id, r.title]));
	const wanted = Object.fromEntries(Object.entries(tags).map(([k, ids]) => [k, new Set(ids)])) as Partial<
		Record<ReferenceTagKey, Set<string>>
	>;
	return catalog.references
		.filter((r): r is ReferencePage => Boolean(r.site))
		.filter((r) => REFERENCE_TAG_KEYS.some((k) => (r[k] ?? []).some((id) => wanted[k]?.has(id))))
		.map((r) => ({ id: r.id, title: r.title, url: r.url, summary: r.summary, siteName: sites.get(r.site) ?? r.site }))
		.sort((a, b) => a.title.localeCompare(b.title));
}
