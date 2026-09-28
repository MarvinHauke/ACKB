// Build-time access to the generated catalog. Server-only: pages are prerendered, so this JSON
// never ships to the browser; each page gets only the slice its load function returns.
import raw from './generated/catalog.json';
import type { Catalog, EntrySummary, RegistryKey, Term } from '$lib/types';
import { REGISTRY_KEYS } from '$lib/types';

export const catalog = raw as unknown as Catalog;

export function summarize(entry: Catalog['entries'][number]): EntrySummary {
	return {
		id: entry.id,
		title: entry.title,
		summary: entry.summary,
		kinds: entry.kinds,
		confidence: entry.confidence,
		added: entry.added,
		terms: Object.fromEntries(REGISTRY_KEYS.map((k) => [k, entry.terms[k].map((t) => t.id)])) as Record<
			RegistryKey,
			string[]
		>,
		sourceTypes: [...new Set(entry.sources.map((s) => s.type))]
	};
}

/** Only the terms at least one entry uses, without descriptions: enough for filters. */
export function usedTerms(): Record<RegistryKey, Pick<Term, 'id' | 'label' | 'count'>[]> {
	return Object.fromEntries(
		REGISTRY_KEYS.map((k) => [
			k,
			catalog.taxonomy[k].filter((t) => t.count > 0).map(({ id, label, count }) => ({ id, label, count }))
		])
	) as Record<RegistryKey, Pick<Term, 'id' | 'label' | 'count'>[]>;
}
