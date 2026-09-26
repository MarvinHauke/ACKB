// Full-text search, loaded on demand: Fuse.js and the prebuilt index (static/data/search-index.json)
// are fetched the first time the search box gets focus, so they don't count toward the initial load.
import { asset } from '$app/paths';

// Must match SEARCH_KEYS in scripts/build-data.js.
const KEYS = [
	{ name: 'title', weight: 3 },
	{ name: 'labels', weight: 2 },
	{ name: 'aliases', weight: 1 },
	{ name: 'summary', weight: 1 }
];

interface SearchDoc {
	id: string;
	title: string;
	summary: string;
	labels: string[];
	aliases: string[];
}

export type Searcher = (query: string) => { id: string; score: number }[];

let pending: Promise<Searcher> | null = null;

export function loadSearch(): Promise<Searcher> {
	pending ??= (async () => {
		const [{ default: Fuse }, res] = await Promise.all([import('fuse.js'), fetch(asset('/data/search-index.json'))]);
		const { docs, index } = (await res.json()) as { docs: SearchDoc[]; index: unknown };
		const fuse = new Fuse(
			docs,
			{ keys: KEYS, includeScore: true, ignoreLocation: true, threshold: 0.35, minMatchCharLength: 2 },
			Fuse.parseIndex(index as Parameters<typeof Fuse.parseIndex>[0])
		);
		return (query) => fuse.search(query).map((r) => ({ id: r.item.id, score: r.score ?? 0 }));
	})();
	pending.catch(() => (pending = null));
	return pending;
}
