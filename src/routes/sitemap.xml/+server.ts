// sitemap.xml, prerendered: home, every article and every tag page with enough articles.
// Thin tag pages (noindex) and /references are left out.
import { catalog } from '$lib/server/catalog';
import { absolute, tagArticleCount } from '$lib/server/seo';
import { isIndexable } from '$lib/seo';
import { REGISTRY_KEYS, REGISTRY_META, termPath } from '$lib/types';

export const prerender = true;

export function GET() {
	const paths = [
		'/',
		...catalog.articles.map((a) => `/article/${a.id}`),
		...REGISTRY_KEYS.flatMap((k) =>
			catalog.taxonomy[k]
				.filter((t) => t.count > 0 && isIndexable(tagArticleCount(k, t)))
				.map((t) => `/${REGISTRY_META[k].slug}/${termPath(t.id, t.parent)}`)
		)
	];
	const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths
		.map((p) => `<url><loc>${absolute(p)}</loc></url>`)
		.join('\n')}\n</urlset>\n`;
	return new Response(body, { headers: { 'Content-Type': 'application/xml' } });
}
