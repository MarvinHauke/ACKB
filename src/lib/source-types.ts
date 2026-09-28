// Source types a reader can hide (e.g. forum threads). A per-browser preference, not a URL filter:
// it applies on every page, including prerendered entry pages, so it lives in localStorage.

/** Same order as the enum in schema/entry.schema.json. */
export const SOURCE_TYPES = ['website', 'paper', 'datasheet', 'patent', 'github', 'video', 'forum', 'manual', 'schematic'];

const KEY = 'ackb:hidden-source-types';

export function loadHiddenTypes(): string[] {
	try {
		const saved = JSON.parse(localStorage.getItem(KEY) ?? '[]');
		return Array.isArray(saved) ? saved.filter((t) => SOURCE_TYPES.includes(t)) : [];
	} catch {
		// No storage (private mode, blocked): nothing hidden.
		return [];
	}
}

export function saveHiddenTypes(types: string[]) {
	try {
		localStorage.setItem(KEY, JSON.stringify(types));
	} catch {
		// Not persisted; still applies for this visit.
	}
}
