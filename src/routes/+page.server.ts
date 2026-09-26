import { catalog, summarize, usedTerms } from '$lib/server/catalog';
import { CONFIDENCES, DIFFICULTIES } from '$lib/types';

export function load() {
	return {
		entries: catalog.entries.map(summarize),
		terms: usedTerms(),
		difficulties: DIFFICULTIES,
		confidences: CONFIDENCES
	};
}
