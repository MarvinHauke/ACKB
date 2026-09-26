import { error } from '@sveltejs/kit';
import { catalog, summarize } from '$lib/server/catalog';
import { REGISTRY_KEYS, REGISTRY_META, SLUG_TO_KEY } from '$lib/types';
import type { EntryGenerator } from './$types';

// One page per taxonomy term that at least one entry uses: /subcircuit/ota_stage, /ic/lm13700, …
export const entries: EntryGenerator = () =>
	REGISTRY_KEYS.flatMap((key) =>
		catalog.taxonomy[key].filter((t) => t.count > 0).map((t) => ({ kind: REGISTRY_META[key].slug, id: t.id }))
	);

export function load({ params }) {
	const key = SLUG_TO_KEY[params.kind];
	const term = catalog.taxonomy[key].find((t) => t.id === params.id);
	if (!term) error(404, 'Unknown term');

	const terms = catalog.taxonomy[key];
	const children = terms.filter((t) => t.parent === term.id && t.count > 0);
	// Entries tagged with the term itself or with one of its children.
	const ids = new Set([term.id, ...children.map((c) => c.id)]);
	const matching = catalog.entries.filter((e) => e.terms[key].some((t) => ids.has(t.id)));

	const lookup = (id: string) => terms.find((t) => t.id === id);
	const manufacturer =
		key === 'products' && term.manufacturer ? catalog.taxonomy.manufacturers.find((m) => m.id === term.manufacturer) : null;

	return {
		key,
		meta: REGISTRY_META[key],
		term,
		parent: term.parent ? (lookup(term.parent) ?? null) : null,
		children: children.map(({ id, label, count }) => ({ id, label, count })),
		alternatives: (term.alternatives ?? []).map((id) => lookup(id)).filter((t) => t !== undefined),
		manufacturer: manufacturer ? { id: manufacturer.id, label: manufacturer.label } : null,
		entries: matching.map(summarize),
		labels: Object.fromEntries(REGISTRY_KEYS.flatMap((k) => catalog.taxonomy[k].map((t) => [t.id, t.label])))
	};
}
