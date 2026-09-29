// SEO rules shared by the pages and the sitemap (server and client safe).
import type { RegistryKey } from './types';

/** Tag pages with fewer articles stay usable but get noindex,follow and stay out of the sitemap. */
export const MIN_INDEXABLE_ARTICLES = 3;

export const isIndexable = (articleCount: number) => articleCount >= MIN_INDEXABLE_ARTICLES;

/** Descriptive page title per node type: what + context, "· ACKB" is appended. */
const TITLE: Record<RegistryKey, (label: string) => string> = {
	components: (l) => `${l} in synth circuits`,
	subcircuits: (l) => `${l} circuits in synthesizers`,
	modules: (l) => `${l} module circuits and build guides`,
	functions: (l) => `${l} in synthesizer circuits`,
	products: (l) => `${l} circuits and schematics`,
	manufacturers: (l) => `${l} synthesizer circuits`,
	authors: (l) => `Articles by ${l} on synth circuits`
};

export function tagTitle(key: RegistryKey, label: string, count: number) {
	return `${TITLE[key](label)}: ${count} ${count === 1 ? 'resource' : 'resources'} · ACKB`;
}

/** The curated description if there is one, else a factual sentence from the data. */
export function tagDescription(key: RegistryKey, typeLabel: string, label: string, count: number, together: string[], description?: string) {
	if (description) return description;
	const n = `${count} curated ${count === 1 ? 'resource' : 'resources'}`;
	const base = key === 'authors' ? `${n} by ${label} on synthesizer circuits.` : `${typeLabel} ${label}: ${n} on synthesizer circuits.`;
	return together.length ? `${base} Often used together with ${together.join(', ')}.` : base;
}
