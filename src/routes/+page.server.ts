import { catalog, summarize, termParents, usedTerms } from '$lib/server/catalog';
import { absolute } from '$lib/server/seo';
import { CONFIDENCES, CONTENT_KINDS } from '$lib/types';

export function load() {
	return {
		canonical: absolute('/'),
		articles: catalog.articles.map(summarize),
		terms: usedTerms(),
		parents: termParents(),
		kinds: CONTENT_KINDS,
		confidences: CONFIDENCES
	};
}
