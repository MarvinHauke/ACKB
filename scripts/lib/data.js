// Loads the raw JSON data (taxonomy registries + articles) from data/.
// Shared by validate.js, build-data.js, check-links.js and new-article.js.
import { readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = fileURLToPath(new URL('../..', import.meta.url));
export const DATA_DIR = join(ROOT, 'data');
// One file per article (link).
export const ARTICLES_DIR = join(DATA_DIR, 'articles');
export const TAXONOMY_DIR = join(DATA_DIR, 'taxonomy');

/**
 * Taxonomy registries: registry key → file name, schema, and the article field that references it.
 * `field` is null for registries that articles don't reference directly.
 */
export const REGISTRIES = {
	manufacturers: { file: 'manufacturers.json', schema: 'term', field: 'manufacturers' },
	products: { file: 'products.json', schema: 'product', field: 'products' },
	modules: { file: 'modules.json', schema: 'term', field: 'modules' },
	subcircuits: { file: 'subcircuits.json', schema: 'subcircuit', field: 'subcircuits' },
	functions: { file: 'functions.json', schema: 'term', field: 'functions' },
	ics: { file: 'ics.json', schema: 'ic', field: 'ics' },
	authors: { file: 'authors.json', schema: 'author', field: 'authors' }
};

export const ARTICLE_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Parse a JSON file; returns { value } or { error } so callers can collect all errors. */
export function readJson(path) {
	try {
		return { value: JSON.parse(readFileSync(path, 'utf8')) };
	} catch (err) {
		return { error: err.message };
	}
}

export function loadTaxonomy() {
	const taxonomy = {};
	const errors = [];
	for (const [key, { file }] of Object.entries(REGISTRIES)) {
		const path = join(TAXONOMY_DIR, file);
		const { value, error } = readJson(path);
		if (error) errors.push(`data/taxonomy/${file}: malformed JSON: ${error}`);
		taxonomy[key] = Array.isArray(value) ? value : [];
	}
	return { taxonomy, errors };
}

export function loadArticles() {
	const articles = [];
	const errors = [];
	const files = readdirSync(ARTICLES_DIR)
		.filter((f) => f.endsWith('.json'))
		.sort();
	for (const file of files) {
		const { value, error } = readJson(join(ARTICLES_DIR, file));
		if (error) {
			errors.push(`data/articles/${file}: malformed JSON: ${error}`);
			continue;
		}
		articles.push({ id: basename(file, '.json'), file: `data/articles/${file}`, data: value });
	}
	return { articles, errors };
}

/** Map registry key → Map(id → term) for fast lookups. */
export function indexTaxonomy(taxonomy) {
	return Object.fromEntries(
		Object.entries(taxonomy).map(([key, terms]) => [key, new Map(terms.map((t) => [t.id, t]))])
	);
}

export function levenshtein(a, b) {
	const row = Array.from({ length: b.length + 1 }, (_, i) => i);
	for (let i = 1; i <= a.length; i++) {
		let prev = row[0];
		row[0] = i;
		for (let j = 1; j <= b.length; j++) {
			const tmp = row[j];
			row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
			prev = tmp;
		}
	}
	return row[b.length];
}

/** Closest known id (by id, label or alias) for a typo, or null. */
export function suggest(unknown, terms) {
	const needle = unknown.toLowerCase().replace(/[\s-]+/g, '_');
	let best = null;
	let bestDist = Infinity;
	for (const term of terms) {
		for (const name of [term.id, term.label, ...(term.aliases ?? [])]) {
			const norm = name.toLowerCase().replace(/[\s-]+/g, '_');
			// Abbreviations ("soft_clip" → "soft_clipping") count as a near match.
			const d = needle.length >= 4 && norm.startsWith(needle) ? 1 : levenshtein(needle, norm);
			if (d < bestDist) [best, bestDist] = [term.id, d];
		}
	}
	return bestDist <= Math.max(2, Math.floor(needle.length / 3)) ? best : null;
}
