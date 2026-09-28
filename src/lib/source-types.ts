// Source types a reader can hide (e.g. forum threads). A per-browser preference, not a URL filter:
// it applies on every page, including prerendered entry pages, so it lives in localStorage.

/** Same order as the enum in schema/entry.schema.json. */
export const SOURCE_TYPES = ['website', 'paper', 'datasheet', 'patent', 'repo', 'video', 'forum', 'manual', 'schematic'];

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

const HTTP_KEY = 'ackb:hide-http';

/** Whether the reader chose to hide http:// links (off by default: many good old sites are http only). */
export function loadHideHttp(): boolean {
	try {
		return localStorage.getItem(HTTP_KEY) === '1';
	} catch {
		return false;
	}
}

export function saveHideHttp(hide: boolean) {
	try {
		if (hide) localStorage.setItem(HTTP_KEY, '1');
		else localStorage.removeItem(HTTP_KEY);
	} catch {
		// Not persisted; still applies for this visit.
	}
}

/** A source is visible unless its type is hidden, or it's http:// while http links are hidden. */
export function sourceVisible(source: { type: string; secure: boolean }, hiddenTypes: string[], hideHttp: boolean) {
	return !hiddenTypes.includes(source.type) && !(hideHttp && !source.secure);
}
