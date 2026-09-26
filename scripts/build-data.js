// Builds everything the site needs from data/ (validates first; aborts on errors):
//   src/lib/server/generated/catalog.json  resolved entries + taxonomy, read by prerendered pages
//   static/data/search-index.json          Fuse docs + prebuilt index, lazy-loaded by the search box
//   static/data/kb.jsonl                   one entry per line, flattened for embeddings / LLM tools
//   static/data/taxonomy.json              all registries, for other tools to reuse the vocabulary
//   static/llms.txt                        plain-text site map for LLM crawlers
// Usage: node scripts/build-data.js
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import Fuse from 'fuse.js';
import { DATA_DIR, REGISTRIES, ROOT, indexTaxonomy, readJson } from './lib/data.js';
import { validate } from './validate.js';

const OUT_CATALOG = join(ROOT, 'src/lib/server/generated/catalog.json');
const OUT_STATIC = join(ROOT, 'static/data');

// Must match the keys in src/lib/search.ts.
const SEARCH_KEYS = [
	{ name: 'title', weight: 3 },
	{ name: 'labels', weight: 2 },
	{ name: 'aliases', weight: 1 },
	{ name: 'summary', weight: 1 }
];

// Related entries: weight per shared term type. Shared subcircuit parents count half.
const RELATED_WEIGHTS = {
	ics: 3,
	subcircuits: 3,
	subcircuitParents: 1.5,
	functions: 2,
	products: 2,
	manufacturers: 1,
	circuitTypes: 1
};
const RELATED_MIN_SCORE = 0.08;
const RELATED_MAX = 5;

function write(path, content) {
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(path, typeof content === 'string' ? content : JSON.stringify(content));
}

/** Link health from scripts/check-links.js, keyed by URL (optional file). */
function loadLinkHealth() {
	const path = join(DATA_DIR, 'link-health.json');
	if (!existsSync(path)) return new Map();
	const { value } = readJson(path);
	return new Map((value?.links ?? []).map((l) => [l.url, l]));
}

function resolveEntries(entries, index, health) {
	return entries.map(({ id, data }) => {
		const terms = {};
		for (const [key, { field }] of Object.entries(REGISTRIES)) {
			terms[key] = (data[field] ?? []).map((ref) => {
				const t = index[key].get(ref);
				return { id: t.id, label: t.label };
			});
		}
		const subcircuitParents = [
			...new Set((data.subcircuits ?? []).map((s) => index.subcircuits.get(s).parent).filter(Boolean))
		];
		return {
			id,
			title: data.title,
			summary: data.summary,
			difficulty: data.difficulty,
			confidence: data.confidence,
			added: data.added,
			reviewed: data.reviewed ?? null,
			terms,
			subcircuitParents,
			sources: data.sources.map((s) => {
				const h = health.get(s.url);
				return {
					...s,
					status: h?.status ?? 'unchecked',
					archiveUrl: h?.archiveUrl ?? null
				};
			})
		};
	});
}

function computeRelated(entries) {
	const sets = entries.map((e) => {
		const s = { subcircuitParents: new Set(e.subcircuitParents) };
		for (const key of Object.keys(REGISTRIES)) s[key] = new Set(e.terms[key].map((t) => t.id));
		return s;
	});
	const labels = new Map();
	for (const e of entries) for (const list of Object.values(e.terms)) for (const t of list) labels.set(t.id, t.label);

	return entries.map((_, i) => {
		const scored = [];
		for (let j = 0; j < entries.length; j++) {
			if (i === j) continue;
			let inter = 0;
			let union = 0;
			const shared = [];
			for (const [key, w] of Object.entries(RELATED_WEIGHTS)) {
				const a = sets[i][key];
				const b = sets[j][key];
				let n = 0;
				for (const x of a) {
					if (!b.has(x)) continue;
					n++;
					if (key !== 'subcircuitParents') shared.push({ w, label: labels.get(x) });
				}
				inter += w * n;
				union += w * (a.size + b.size - n);
			}
			const score = union ? inter / union : 0;
			if (score >= RELATED_MIN_SCORE) {
				shared.sort((x, y) => y.w - x.w);
				scored.push({
					id: entries[j].id,
					title: entries[j].title,
					score: Math.round(score * 1000) / 1000,
					reasons: shared.slice(0, 4).map((s) => s.label)
				});
			}
		}
		scored.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
		return scored.slice(0, RELATED_MAX);
	});
}

function taxonomyWithCounts(taxonomy, entries) {
	const out = {};
	for (const key of Object.keys(REGISTRIES)) {
		// A parent term counts every entry tagged with it or with one of its children.
		const parentOf = new Map(taxonomy[key].map((t) => [t.id, t.parent]));
		const counts = new Map();
		for (const e of entries) {
			const ids = new Set(e.terms[key].flatMap((t) => [t.id, parentOf.get(t.id)]).filter(Boolean));
			for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
		}
		out[key] = taxonomy[key].map((t) => ({ ...t, count: counts.get(t.id) ?? 0 }));
	}
	return out;
}

function searchDocs(entries, index) {
	return entries.map((e) => {
		const labels = [];
		const aliases = [];
		for (const [key, list] of Object.entries(e.terms)) {
			for (const { id } of list) {
				const t = index[key].get(id);
				labels.push(t.label);
				aliases.push(...(t.aliases ?? []));
			}
		}
		return { id: e.id, title: e.title, summary: e.summary, labels, aliases };
	});
}

function kbJsonl(entries, index) {
	return entries
		.map((e) => {
			const terms = Object.fromEntries(
				Object.entries(e.terms).map(([key, list]) => [
					key,
					list.map(({ id }) => {
						const t = index[key].get(id);
						return { id, label: t.label, aliases: t.aliases ?? [] };
					})
				])
			);
			const labelText = Object.values(terms)
				.flat()
				.map((t) => t.label)
				.join(', ');
			return JSON.stringify({
				id: e.id,
				title: e.title,
				summary: e.summary,
				difficulty: e.difficulty,
				confidence: e.confidence,
				added: e.added,
				terms,
				sources: e.sources.map(({ type, title, url, author, year }) => ({ type, title, url, author, year })),
				embedText: `${e.title}. ${e.summary} Topics: ${labelText}.`
			});
		})
		.join('\n');
}

function llmsTxt(entries, taxonomy) {
	const lines = [
		'# Analog Circuit Knowledge Base',
		'',
		'> Curated index of external resources (papers, datasheets, build logs, forum threads) on analog',
		'> synthesizer circuits, classified by manufacturer, product, circuit type, subcircuit, function and IC.',
		'> Machine-readable: data/kb.jsonl (one entry per line), data/taxonomy.json (vocabulary).',
		'',
		'## Entries',
		...entries.map((e) => `- [${e.title}](entry/${e.id}): ${e.summary}`),
		'',
		'## Subcircuits',
		...taxonomy.subcircuits.filter((t) => t.count).map((t) => `- [${t.label}](subcircuit/${t.id})`),
		'',
		'## Functions',
		...taxonomy.functions.filter((t) => t.count).map((t) => `- [${t.label}](function/${t.id})`)
	];
	return lines.join('\n') + '\n';
}

const { errors, warnings, entries: raw, taxonomy } = validate();
for (const e of errors) console.error(`error ${e}`);
if (errors.length) {
	console.error(`build-data: ${errors.length} validation errors, nothing written`);
	process.exit(1);
}

const index = indexTaxonomy(taxonomy);
const entries = resolveEntries(raw, index, loadLinkHealth());
const related = computeRelated(entries);
entries.forEach((e, i) => (e.related = related[i]));
entries.sort((a, b) => b.added.localeCompare(a.added) || a.title.localeCompare(b.title));

const counted = taxonomyWithCounts(taxonomy, entries);
const docs = searchDocs(entries, index);

write(OUT_CATALOG, { generatedAt: new Date().toISOString(), entries, taxonomy: counted });
write(join(OUT_STATIC, 'search-index.json'), { docs, index: Fuse.createIndex(SEARCH_KEYS, docs).toJSON() });
write(join(OUT_STATIC, 'kb.jsonl'), kbJsonl(entries, index) + '\n');
write(join(OUT_STATIC, 'taxonomy.json'), taxonomy);
write(join(ROOT, 'static/llms.txt'), llmsTxt(entries, counted));

console.log(`build-data: ${entries.length} entries written (${warnings.length} warnings)`);
