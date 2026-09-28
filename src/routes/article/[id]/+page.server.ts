import { error } from '@sveltejs/kit';
import { catalog, termParents } from '$lib/server/catalog';
import type { EntryGenerator } from './$types';

export const entries: EntryGenerator = () => catalog.articles.map((a) => ({ id: a.id }));

export function load({ params }) {
	const article = catalog.articles.find((a) => a.id === params.id);
	if (!article) error(404, 'Article not found');
	const byId = new Map(catalog.articles.map((a) => [a.id, a]));
	// Related articles carry their link, so the list can link straight out as well.
	const related = article.related.map((r) => ({ ...r, url: byId.get(r.id)?.url ?? '' }));
	return { article, related, parents: termParents() };
}
