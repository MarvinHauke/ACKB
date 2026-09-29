// Facet filtering without Fuse: inverted index term → article ids, intersected per selected term.
// Filter state lives in the URL (?function=soft-clipping&module=fx/delay) so views are shareable.
import type { ArticleSummary, ContentKind, ParentMap, RegistryKey } from './types';
import { CONTENT_KINDS, REGISTRY_KEYS, REGISTRY_META, termPath } from './types';

export type FilterKey = RegistryKey | 'kind' | 'confidence';

export type Filters = Record<FilterKey, string[]>;

export const FILTER_KEYS: FilterKey[] = [...REGISTRY_KEYS, 'kind', 'confidence'];

/** URL query parameter per filter. */
export const PARAM: Record<FilterKey, string> = {
	...(Object.fromEntries(REGISTRY_KEYS.map((k) => [k, REGISTRY_META[k].slug])) as Record<RegistryKey, string>),
	kind: 'kind',
	confidence: 'confidence'
};

export function emptyFilters(): Filters {
	return Object.fromEntries(FILTER_KEYS.map((k) => [k, []])) as unknown as Filters;
}

/** Subtypes appear as `parent/id` in URLs (?module=fx/delay); filters hold the plain id. */
export function filtersFromParams(params: URLSearchParams): Filters {
	const f = emptyFilters();
	for (const key of FILTER_KEYS) f[key] = params.getAll(PARAM[key]).map((v) => v.split('/').pop()!);
	return f;
}

/** Text terms of the URL: the last `q` is the live text in the field, the earlier ones are text chips. */
export function queriesFromParams(params: URLSearchParams): { texts: string[]; live: string } {
	const all = params.getAll('q');
	const live = all.pop() ?? '';
	return { texts: all.filter((v) => v.trim()), live };
}

/**
 * `query`: the live text, or `[...chips, live]`. The live slot is always written when chips exist
 * (`?q=vca&q=`), so a reload gives the same chips instead of turning the last one into live text.
 */
export type GroupBy = 'none' | 'kind' | 'type' | 'author' | 'module';
export type SortBy = 'best' | 'new' | 'year' | 'title';
export const GROUPS: GroupBy[] = ['none', 'kind', 'type', 'author', 'module'];
export const SORTS: SortBy[] = ['best', 'new', 'year', 'title'];

/** `?group=…&sort=…`; unknown or missing values fall back to the defaults (none, best). */
export function viewFromParams(params: URLSearchParams): { group: GroupBy; sort: SortBy } {
	const group = params.get('group') as GroupBy;
	const sort = params.get('sort') as SortBy;
	return { group: GROUPS.includes(group) ? group : 'none', sort: SORTS.includes(sort) ? sort : 'best' };
}

export function filtersToParams(
	filters: Filters,
	query: string | string[],
	parents: ParentMap = {},
	view?: { group: GroupBy; sort: SortBy }
): URLSearchParams {
	const p = new URLSearchParams();
	if (Array.isArray(query)) {
		const chips = query.slice(0, -1).filter(Boolean);
		for (const q of chips) p.append('q', q);
		const live = query.at(-1) ?? '';
		if (live || chips.length) p.append('q', live);
	} else if (query) p.append('q', query);
	for (const key of FILTER_KEYS) for (const v of filters[key]) p.append(PARAM[key], termPath(v, parents[`${key}:${v}`]));
	if (view?.group && view.group !== 'none') p.set('group', view.group);
	if (view?.sort && view.sort !== 'best') p.set('sort', view.sort);
	return p;
}

export function activeCount(filters: Filters): number {
	return FILTER_KEYS.reduce((n, k) => n + filters[k].length, 0);
}

export type FacetIndex = Record<FilterKey, Map<string, Set<string>>>;

export function buildFacetIndex(articles: ArticleSummary[]): FacetIndex {
	const index = Object.fromEntries(FILTER_KEYS.map((k) => [k, new Map()])) as FacetIndex;
	const add = (key: FilterKey, value: string, id: string) => {
		let set = index[key].get(value);
		if (!set) index[key].set(value, (set = new Set()));
		set.add(id);
	};
	for (const e of articles) {
		for (const k of REGISTRY_KEYS) for (const t of e.terms[k]) add(k, t, e.id);
		for (const k of e.kinds) add('kind', k, e.id);
		add('confidence', e.confidence, e.id);
	}
	return index;
}

/**
 * Article ids matching all filters, or null when no filter is active.
 * Taxonomy terms combine with AND (an article must have every selected term);
 * content kind and confidence values combine with OR ("build guide or explanation").
 */
export function matchingIds(index: FacetIndex, filters: Filters): Set<string> | null {
	let result: Set<string> | null = null;
	const intersect = (set: Set<string>) => {
		result = result === null ? new Set(set) : new Set([...result].filter((id) => set.has(id)));
	};
	for (const key of REGISTRY_KEYS) {
		for (const value of filters[key]) intersect(index[key].get(value) ?? new Set());
	}
	for (const key of ['kind', 'confidence'] as const) {
		if (!filters[key].length) continue;
		const union = new Set<string>();
		for (const value of filters[key]) for (const id of index[key].get(value) ?? []) union.add(id);
		intersect(union);
	}
	return result;
}

/** Number of selected taxonomy tags (kind and confidence don't count). */
export function tagCount(filters: Filters): number {
	return REGISTRY_KEYS.reduce((n, k) => n + filters[k].length, 0);
}

/** Article ids passing the kind and confidence filters (OR within each), or null when neither is set. */
export function kindConfidenceIds(index: FacetIndex, filters: Filters): Set<string> | null {
	let result = null as Set<string> | null;
	for (const key of ['kind', 'confidence'] as const) {
		if (!filters[key].length) continue;
		const union = new Set<string>();
		for (const value of filters[key]) for (const id of index[key].get(value) ?? []) union.add(id);
		result = result === null ? union : new Set([...result].filter((id) => union.has(id)));
	}
	return result;
}

/** For each article, how many of the selected taxonomy tags it has (only articles with at least one). */
export function matchCounts(index: FacetIndex, filters: Filters): Map<string, number> {
	const counts = new Map<string, number>();
	for (const key of REGISTRY_KEYS) {
		for (const value of filters[key]) for (const id of index[key].get(value) ?? []) counts.set(id, (counts.get(id) ?? 0) + 1);
	}
	return counts;
}

// ---- Group by / sort helpers (deterministic, one primary value per article, so no duplicates) ----

/** The first of the article's kinds in CONTENT_KINDS order. */
export const primaryKind = (a: ArticleSummary): ContentKind | undefined => CONTENT_KINDS.find((k) => a.kinds.includes(k));

/** The article's host without "www.". */
export const hostOf = (url: string) => new URL(url).hostname.replace(/^www\./, '');

/** The first listed author's label; without an author, the host of the link. */
export const authorOrHost = (a: ArticleSummary, labels: Map<string, string>) =>
	a.terms.authors.length ? (labels.get(a.terms.authors[0]) ?? a.terms.authors[0]) : hostOf(a.url);

/**
 * The first listed module, replaced by its subtype when the article also lists one of that module's
 * subtypes ("FX › Delay & Reverb"). `parentOf` maps a subtype id to its parent id.
 */
export function primaryModule(a: ArticleSummary, labels: Map<string, string>, parentOf: (id: string) => string | undefined): string | undefined {
	const first = a.terms.modules[0];
	if (!first) return undefined;
	const sub = a.terms.modules.find((id) => parentOf(id) === first) ?? (parentOf(first) ? first : undefined);
	const label = (id: string) => labels.get(id) ?? id;
	if (!sub) return label(first);
	const parent = parentOf(sub)!;
	return `${label(parent)} › ${label(sub)}`;
}
