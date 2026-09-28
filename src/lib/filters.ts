// Facet filtering without Fuse: inverted index term → article ids, intersected per selected term.
// Filter state lives in the URL (?function=soft-clipping&module=fx/delay) so views are shareable.
import type { ArticleSummary, ParentMap, RegistryKey } from './types';
import { REGISTRY_KEYS, REGISTRY_META, termPath } from './types';

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

export function filtersToParams(filters: Filters, query: string, parents: ParentMap = {}): URLSearchParams {
	const p = new URLSearchParams();
	if (query) p.set('q', query);
	for (const key of FILTER_KEYS) for (const v of filters[key]) p.append(PARAM[key], termPath(v, parents[`${key}:${v}`]));
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
