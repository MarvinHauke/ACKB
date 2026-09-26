import { catalog } from '$lib/server/catalog';
import { REGISTRY_KEYS, REGISTRY_META } from '$lib/types';

export function load() {
	return {
		groups: REGISTRY_KEYS.map((key) => ({
			key,
			meta: REGISTRY_META[key],
			terms: catalog.taxonomy[key]
				.filter((t) => t.count > 0)
				.map(({ id, label, count, parent }) => ({ id, label, count, parent: parent ?? null }))
		}))
	};
}
