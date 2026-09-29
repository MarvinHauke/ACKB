// References: general electronics sites and their pages, outside the graph, search and filters.
import { catalog } from '$lib/server/catalog';

export function load() {
	return { references: catalog.references };
}
