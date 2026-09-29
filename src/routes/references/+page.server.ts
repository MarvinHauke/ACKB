// Reference Shelf: general electronics sites, outside the graph, search and filters.
import { catalog } from '$lib/server/catalog';

export function load() {
	return { references: catalog.references };
}
