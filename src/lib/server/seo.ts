import { catalog } from './catalog';
import type { RegistryKey, Term } from '$lib/types';

// Single place for the public base URL. Set SITE_URL at build time for another domain,
// e.g. SITE_URL=https://irregular-instruments.com/ackb. It includes the path prefix (BASE_PATH).
export const SITE_URL = (process.env.SITE_URL ?? 'https://marvinhauke.github.io/ackb').replace(/\/+$/, '');

// The path of SITE_URL must match BASE_PATH ("/ackb"): warn when they disagree.
if (new URL(SITE_URL).pathname.replace(/\/$/, '') !== (process.env.BASE_PATH ?? '')) console.warn('SEO: SITE_URL path and BASE_PATH differ');

/** Absolute URL of a site path ('/' or '/component/lm13700'). */
export const absolute = (path: string) => (path === '/' ? `${SITE_URL}/` : `${SITE_URL}${path}`);

/** Articles on a tag or its subtypes: the number the tag page lists, used for noindex and the sitemap alike. */
export function tagArticleCount(key: RegistryKey, term: Term) {
	const ids = new Set([term.id, ...catalog.taxonomy[key].filter((t) => t.parent === term.id).map((t) => t.id)]);
	return catalog.articles.filter((a) => a.terms[key].some((t) => ids.has(t.id))).length;
}
