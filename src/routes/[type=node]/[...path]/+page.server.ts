// One page per used tag node (IC, subcircuit, function, module, product, manufacturer, author):
// its facts, related nodes (edges in the knowledge graph) and the articles tagged with it.
// Subtypes live under their parent: /module/fx/delay, /subcircuit/opamp-stage/voltage-follower.
import { error } from '@sveltejs/kit';
import { catalog, referencePagesFor, summarize, termLabels, termParents } from '$lib/server/catalog';
import { REFERENCE_TAG_KEYS, REGISTRY_KEYS, REGISTRY_META, SLUG_TO_KEY, termPath, type NodeRef, type ReferenceTagKey, type RegistryKey } from '$lib/types';
import { absolute } from '$lib/server/seo';
import { isIndexable, tagDescription, tagTitle } from '$lib/seo';
import type { EntryGenerator } from './$types';

export const entries: EntryGenerator = () =>
	REGISTRY_KEYS.flatMap((key) =>
		catalog.taxonomy[key].filter((t) => t.count > 0).map((t) => ({ type: REGISTRY_META[key].slug, path: termPath(t.id, t.parent) }))
	);

export function load({ params }) {
	const key = SLUG_TO_KEY[params.type];
	const terms = catalog.taxonomy[key];
	const segments = params.path.split('/');
	const id = segments.at(-1);
	const term = terms.find((t) => t.id === id && t.count > 0);
	// The path must match the tree exactly: /module/fx/delay, not /module/delay.
	if (!term || params.path !== termPath(term.id, term.parent)) error(404, 'Not found');

	// The term and its subtypes (FX → Delay & Reverb, …; Op-Amp Stage → Voltage Follower, …).
	const ids = new Set([term.id, ...terms.filter((t) => t.parent === term.id).map((t) => t.id)]);
	const articles = catalog.articles.filter((a) => a.terms[key].some((t) => ids.has(t.id))).map(summarize);

	const find = (k: RegistryKey, id?: string) => (id ? catalog.taxonomy[k].find((t) => t.id === id) : undefined);
	const ref = (r: NodeRef) => {
		const t = find(r.key, r.id);
		return { ...r, slug: REGISTRY_META[r.key].slug, path: termPath(r.id, t?.parent), label: t?.label ?? r.id };
	};

	const meta = REGISTRY_META[key];
	const together = term.related.together.map(ref);
	const path = termPath(term.id, term.parent);
	const parent = find(key, term.parent);
	// Home › Type › [Parent ›] Tag. Same labels as the visible breadcrumbs; the type has no page, so no URL.
	const crumbs = [
		{ name: 'Home', url: absolute('/') },
		{ name: meta.plural },
		...(parent ? [{ name: parent.label, url: absolute(`/${meta.slug}/${parent.id}`) }] : []),
		{ name: term.label, url: absolute(`/${meta.slug}/${path}`) }
	];

	return {
		seo: {
			title: tagTitle(key, term.label, articles.length),
			description: tagDescription(key, meta.label, term.label, articles.length, together.slice(0, 3).map((r) => r.label), term.description),
			canonical: absolute(`/${meta.slug}/${path}`),
			noindex: !isIndexable(articles.length),
			crumbs
		},
		key,
		meta: REGISTRY_META[key],
		term,
		parent: find(key, term.parent),
		children: terms
			.filter((t) => t.parent === term.id && t.count > 0)
			.map((t) => ({ path: termPath(t.id, term.id), label: t.label })),
		// A product's maker is a node too (the IC `manufacturer` field is free text).
		maker: key === 'products' ? find('manufacturers', term.manufacturer) : undefined,
		same: term.related.same.map(ref),
		together: term.related.together.map(ref),
		articles,
		// References pointing to this tag or its subtypes, for "Need the basics?" (not part of the graph).
		basics: REFERENCE_TAG_KEYS.includes(key as ReferenceTagKey) ? referencePagesFor({ [key]: ids }) : [],
		labels: termLabels(),
		parents: termParents()
	};
}
