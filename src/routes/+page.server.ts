import { catalog, summarize, usedTerms } from '$lib/server/catalog';
import { CONFIDENCES, CONTENT_KINDS } from '$lib/types';

export function load() {
	return {
		entries: catalog.entries.map(summarize),
		terms: usedTerms(),
		kinds: CONTENT_KINDS,
		confidences: CONFIDENCES
	};
}
