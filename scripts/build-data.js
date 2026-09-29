// Builds everything the site needs from data/ (validates first; aborts on errors):
//   src/lib/server/generated/catalog.json  resolved articles + taxonomy (with related nodes) + references (sites and pages), read by prerendered pages
//   static/data/search-index.json          Fuse docs + prebuilt index, lazy-loaded by the search box
//   static/data/kb.jsonl                   one article per line, flattened for embeddings / LLM tools
//   static/data/taxonomy.json              all registries, for other tools to reuse the vocabulary
//   static/data/<slug>/<id>.json           articles and related nodes per tag (e.g. component/ca3080.json), for the PDF_OCR CLI
//   static/data/index.json                 lists those lookup files
//   static/data/graph.json                 the knowledge graph: nodes (articles, tags) and edges
//   static/llms.txt                        plain-text site map for LLM crawlers
// Usage: node scripts/build-data.js
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import Fuse from 'fuse.js';
import { DATA_DIR, REGISTRIES, ROOT, indexTaxonomy, readJson } from './lib/data.js';
import { validate } from './validate.js';

const OUT_CATALOG = join(ROOT, 'src/lib/server/generated/catalog.json');
const OUT_STATIC = join(ROOT, 'static/data');
// 3 since 2026-09-29: kebab-case ids, nested subtype paths, `components` (was `ics`), /component/ paths.
const SCHEMA_VERSION = 3;

// Must match the keys in src/lib/search.ts.
const SEARCH_KEYS = [
	{ name: 'title', weight: 3 },
	{ name: 'labels', weight: 2 },
	{ name: 'aliases', weight: 1 },
	{ name: 'summary', weight: 1 },
	{ name: 'authors', weight: 1 }
];

// Related articles: weight per shared term type. Shared subcircuit parents count half.
const RELATED_WEIGHTS = {
	components: 3,
	subcircuits: 3,
	subcircuitParents: 1.5,
	functions: 2,
	products: 2,
	manufacturers: 1,
	modules: 1
};
const RELATED_MIN_SCORE = 0.08;
const RELATED_MAX = 6;
// Tag nodes "often used together" with a node: at most this many, from at least this many shared articles.
const TOGETHER_MAX = 10;
const TOGETHER_MIN = 2;

// URL segment per registry, same as REGISTRY_META in src/lib/types.ts.
const SLUGS = {
	manufacturers: 'manufacturer',
	products: 'product',
	modules: 'module',
	subcircuits: 'subcircuit',
	functions: 'function',
	components: 'component',
	authors: 'author'
};

/** A tag's path below its type: its id, or parent/id for subtypes (same as termPath in src/lib/types.ts). */
const termPath = (t) => (t.parent ? `${t.parent}/${t.id}` : t.id);

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

/**
 * Confidence from the article's type and origin: official (datasheet, manual or manufacturer
 * origin), academic (paper, patent or academic origin), otherwise community.
 */
function deriveConfidence({ type, origin }) {
	if (['datasheet', 'manual'].includes(type) || origin === 'manufacturer') return 'official';
	if (['paper', 'patent'].includes(type) || origin === 'academic') return 'academic';
	return 'community';
}

function resolveArticles(raw, index, health) {
	return raw.map(({ id, data }) => {
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
		const h = health.get(data.url);
		return {
			id,
			title: data.title,
			url: data.url,
			type: data.type,
			year: data.year ?? null,
			lang: data.lang ?? 'en',
			license: data.license ?? null,
			summary: data.summary,
			summaryFromGroup: data.summaryFromGroup ?? false,
			kinds: data.kinds,
			confidence: deriveConfidence(data),
			added: data.added,
			reviewed: data.reviewed ?? null,
			status: h?.status ?? 'unchecked',
			archiveUrl: h?.archiveUrl ?? null,
			terms,
			subcircuitParents
		};
	});
}

function computeRelated(articles) {
	const sets = articles.map((e) => {
		const s = { subcircuitParents: new Set(e.subcircuitParents) };
		for (const key of Object.keys(RELATED_WEIGHTS)) if (key in e.terms) s[key] = new Set(e.terms[key].map((t) => t.id));
		return s;
	});
	const labels = new Map();
	for (const e of articles) for (const list of Object.values(e.terms)) for (const t of list) labels.set(t.id, t.label);

	return articles.map((_, i) => {
		const scored = [];
		for (let j = 0; j < articles.length; j++) {
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
					id: articles[j].id,
					title: articles[j].title,
					score: Math.round(score * 1000) / 1000,
					reasons: shared.slice(0, 4).map((s) => s.label)
				});
			}
		}
		scored.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
		return scored.slice(0, RELATED_MAX);
	});
}

/** Article ids per tag node; a parent term also collects the articles of its children. */
function articlesByNode(taxonomy, articles) {
	const out = {};
	for (const key of Object.keys(REGISTRIES)) {
		const parentOf = new Map(taxonomy[key].map((t) => [t.id, t.parent]));
		const map = new Map(taxonomy[key].map((t) => [t.id, []]));
		for (const a of articles) {
			const ids = new Set(a.terms[key].flatMap((t) => [t.id, parentOf.get(t.id)]).filter(Boolean));
			for (const id of ids) map.get(id)?.push(a.id);
		}
		out[key] = map;
	}
	return out;
}

/**
 * Related tag nodes, the edges between tags:
 * - `same`: same kind of thing (component alternatives and same category, subtypes/siblings, a maker's products)
 * - `together`: tags of other types most often on the same articles (e.g. CA3080 ↔ OTA stage, VCA)
 */
function nodeRelations(taxonomy, articles, byNode) {
	const byId = new Map(articles.map((a) => [a.id, a]));
	const used = (key, id) => (byNode[key].get(id)?.length ?? 0) > 0;
	const ref = (key, id) => ({ key, id });
	const out = {};
	for (const key of Object.keys(REGISTRIES)) {
		out[key] = new Map();
		for (const t of taxonomy[key]) {
			if (!used(key, t.id)) continue;
			const same = [];
			if (key === 'components') {
				for (const alt of t.alternatives ?? []) same.push(ref('components', alt));
				for (const o of taxonomy.components) {
					if (o.id !== t.id && o.category === t.category && used('components', o.id)) same.push(ref('components', o.id));
				}
			} else if (key === 'products') {
				for (const o of taxonomy.products) {
					if (o.id !== t.id && o.manufacturer === t.manufacturer && used('products', o.id)) same.push(ref('products', o.id));
				}
			} else if (key === 'manufacturers') {
				for (const o of taxonomy.products) if (o.manufacturer === t.id && used('products', o.id)) same.push(ref('products', o.id));
			} else {
				// Parent, children and siblings (same parent), then the rest of the sidebar group.
				for (const o of taxonomy[key]) {
					if (o.id === t.id || !used(key, o.id)) continue;
					const family = o.id === t.parent || o.parent === t.id || (t.parent && o.parent === t.parent);
					const group = t.group && o.group === t.group;
					if (family || group) same.push(ref(key, o.id));
				}
			}
			const counts = new Map();
			for (const aid of byNode[key].get(t.id)) {
				for (const [k, list] of Object.entries(byId.get(aid).terms)) {
					if (k === key || k === 'authors') continue;
					for (const x of list) counts.set(`${k}:${x.id}`, (counts.get(`${k}:${x.id}`) ?? 0) + 1);
				}
			}
			const together = [...counts]
				.filter(([, n]) => n >= TOGETHER_MIN)
				.sort((a, b) => b[1] - a[1])
				.slice(0, TOGETHER_MAX)
				.map(([k, n]) => {
					const [rk, id] = k.split(':');
					return { key: rk, id, n };
				});
			const seen = new Set();
			out[key].set(t.id, {
				same: same.filter((r) => !seen.has(r.id) && seen.add(r.id)),
				together
			});
		}
	}
	return out;
}

/** Terms with their article count and related nodes (unused terms get count 0 and no relations). */
function enrichTaxonomy(taxonomy, byNode, relations) {
	const out = {};
	for (const key of Object.keys(REGISTRIES)) {
		out[key] = taxonomy[key].map((t) => ({
			...t,
			count: byNode[key].get(t.id)?.length ?? 0,
			related: relations[key].get(t.id) ?? { same: [], together: [] }
		}));
	}
	return out;
}

function searchDocs(articles, index) {
	return articles.map((e) => {
		const labels = [];
		const aliases = [];
		for (const [key, list] of Object.entries(e.terms)) {
			if (key === 'authors') continue;
			for (const { id } of list) {
				const t = index[key].get(id);
				labels.push(t.label);
				aliases.push(...(t.aliases ?? []));
			}
		}
		const authors = e.terms.authors.flatMap(({ id }) => {
			const t = index.authors.get(id);
			return [t.label, ...(t.aliases ?? [])];
		});
		return { id: e.id, title: e.title, summary: e.summary, labels, aliases, authors };
	});
}

function termsOut(e, index) {
	return Object.fromEntries(
		Object.entries(e.terms).map(([key, list]) => [
			key,
			list.map(({ id }) => {
				const t = index[key].get(id);
				return { id, label: t.label, aliases: t.aliases ?? [] };
			})
		])
	);
}

function articleOut(e) {
	return {
		id: e.id,
		title: e.title,
		url: e.url,
		type: e.type,
		summary: e.summary,
		kinds: e.kinds,
		confidence: e.confidence,
		year: e.year,
		status: e.status,
		path: `article/${e.id}`
	};
}

function kbJsonl(articles, index) {
	return articles
		.map((e) => {
			const terms = termsOut(e, index);
			const labelText = Object.entries(terms)
				.filter(([key]) => key !== 'authors')
				.flatMap(([, list]) => list.map((t) => t.label))
				.join(', ');
			return JSON.stringify({
				schemaVersion: SCHEMA_VERSION,
				...articleOut(e),
				added: e.added,
				terms,
				embedText: `${e.title}. ${e.summary} Topics: ${labelText}.`
			});
		})
		.join('\n');
}

/**
 * One small file per used tag, so a tool can fetch exactly what it needs for one detection
 * (data/subcircuit/ota_stage.json) instead of all of kb.jsonl. Stale files are removed first.
 */
function writeLookups(articles, taxonomy) {
	const byId = new Map(articles.map((a) => [a.id, a]));
	const find = (key, id) => taxonomy[key].find((t) => t.id === id);
	const lookups = {};
	for (const [key, slug] of Object.entries(SLUGS)) {
		rmSync(join(OUT_STATIC, slug), { recursive: true, force: true });
		lookups[slug] = [];
		for (const term of taxonomy[key].filter((t) => t.count)) {
			const refOut = (r) => {
				const t = find(r.key, r.id);
				return { type: SLUGS[r.key], id: r.id, path: termPath(t), label: t.label, ...(r.n ? { articles: r.n } : {}) };
			};
			const { related, count, ...facts } = term;
			write(join(OUT_STATIC, slug, `${termPath(term)}.json`), {
				schemaVersion: SCHEMA_VERSION,
				type: slug,
				term: { ...facts, path: termPath(term), aliases: term.aliases ?? [] },
				related: { same: related.same.map(refOut), together: related.together.map(refOut) },
				articles: articles
					.filter((a) => a.terms[key].some((t) => t.id === term.id || term.id === find(key, t.id)?.parent))
					.map((a) => articleOut(byId.get(a.id)))
			});
			lookups[slug].push(termPath(term));
		}
	}
	write(join(OUT_STATIC, 'index.json'), {
		schemaVersion: SCHEMA_VERSION,
		pattern: 'data/<type>/<path>.json (path = id, or parent/id for subtypes)',
		// PDF_OCR detection kind (snake_case) → subcircuit path: data/subcircuit/<path>.json.
		pdfOcrKinds: Object.fromEntries(
			taxonomy.subcircuits.filter((t) => t.count && t.pdfOcrKind).map((t) => [t.pdfOcrKind, termPath(t)])
		),
		lookups
	});
}

/** The whole knowledge graph in one file: nodes are articles and used tags, edges connect them. */
function graphJson(articles, taxonomy) {
	const nodes = [];
	const edges = [];
	for (const a of articles) nodes.push({ id: `article:${a.id}`, type: 'article', label: a.title, url: a.url });
	for (const [key, slug] of Object.entries(SLUGS)) {
		for (const t of taxonomy[key].filter((x) => x.count)) {
			nodes.push({ id: `${slug}:${t.id}`, type: slug, label: t.label });
			if (t.parent) edges.push({ from: `${slug}:${t.id}`, to: `${slug}:${t.parent}`, rel: 'subtype_of' });
			if (key === 'products') edges.push({ from: `product:${t.id}`, to: `manufacturer:${t.manufacturer}`, rel: 'made_by' });
			for (const alt of t.alternatives ?? []) edges.push({ from: `component:${t.id}`, to: `component:${alt}`, rel: 'alternative' });
		}
	}
	for (const a of articles) {
		for (const [key, list] of Object.entries(a.terms)) {
			for (const t of list) {
				edges.push({ from: `article:${a.id}`, to: `${SLUGS[key]}:${t.id}`, rel: key === 'authors' ? 'by' : 'tagged' });
			}
		}
	}
	return { schemaVersion: SCHEMA_VERSION, nodes, edges };
}

function llmsTxt(articles, taxonomy) {
	const lines = [
		'# Analog Circuit Knowledge Base',
		'',
		'> Curated index of external resources (papers, datasheets, build logs, videos) on synthesizer',
		'> circuits, tagged by manufacturer, product, module, subcircuit, function, component and author.',
		'> Machine-readable: data/kb.jsonl (one article per line), data/graph.json (knowledge graph),',
		'> data/<type>/<id>.json (per tag), data/taxonomy.json (vocabulary).',
		'',
		'## Articles',
		...articles.map((e) => `- [${e.title}](article/${e.id}): ${e.summary}`),
		'',
		'## Subcircuits',
		...taxonomy.subcircuits.filter((t) => t.count).map((t) => `- [${t.label}](subcircuit/${termPath(t)})`),
		'',
		'## Functions',
		...taxonomy.functions.filter((t) => t.count).map((t) => `- [${t.label}](function/${termPath(t)})`),
		'',
		'## Components & ICs',
		...taxonomy.components.filter((t) => t.count).map((t) => `- [${t.label}](component/${t.id})`)
	];
	return lines.join('\n') + '\n';
}

const { errors, warnings, articles: raw, taxonomy, references } = validate();
for (const e of errors) console.error(`error ${e}`);
if (errors.length) {
	console.error(`build-data: ${errors.length} validation errors, nothing written`);
	process.exit(1);
}

const index = indexTaxonomy(taxonomy);
const articles = resolveArticles(raw, index, loadLinkHealth());
const related = computeRelated(articles);
articles.forEach((e, i) => (e.related = related[i]));
articles.sort((a, b) => b.added.localeCompare(a.added) || a.title.localeCompare(b.title));

const byNode = articlesByNode(taxonomy, articles);
const enriched = enrichTaxonomy(taxonomy, byNode, nodeRelations(taxonomy, articles, byNode));
const docs = searchDocs(articles, index);

write(OUT_CATALOG, { generatedAt: new Date().toISOString(), articles, taxonomy: enriched, references });
write(join(OUT_STATIC, 'search-index.json'), { docs, index: Fuse.createIndex(SEARCH_KEYS, docs).toJSON() });
write(join(OUT_STATIC, 'kb.jsonl'), kbJsonl(articles, index) + '\n');
write(join(OUT_STATIC, 'taxonomy.json'), taxonomy);
write(join(OUT_STATIC, 'graph.json'), graphJson(articles, enriched));
// Old names of data/module/ and data/component/.
for (const old of ['type', 'ic']) rmSync(join(OUT_STATIC, old), { recursive: true, force: true });
writeLookups(articles, enriched);
write(join(ROOT, 'static/llms.txt'), llmsTxt(articles, enriched));

console.log(`build-data: ${articles.length} articles written (${warnings.length} warnings)`);
