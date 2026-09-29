// Validates data/: JSON syntax, JSON Schema, article ids, referential integrity and duplicates.
// Usage: node scripts/validate.js   (exit code 1 on errors; warnings never fail)
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import {
	ARTICLE_ID,
	REGISTRIES,
	ROOT,
	indexTaxonomy,
	loadArticles,
	loadReferences,
	loadTaxonomy,
	suggest
} from './lib/data.js';

function loadSchemas() {
	const ajv = new Ajv2020({ allErrors: true, strict: false });
	addFormats(ajv);
	const read = (p) => JSON.parse(readFileSync(join(ROOT, 'schema', p), 'utf8'));
	for (const name of ['term', 'product', 'component', 'subcircuit', 'author']) {
		ajv.addSchema(read(`taxonomy/${name}.schema.json`));
	}
	return {
		article: ajv.compile(read('article.schema.json')),
		references: ajv.compile(read('reference.schema.json')),
		taxonomy: (name) => ajv.getSchema(`https://ackb.local/schema/taxonomy/${name}.schema.json`)
	};
}

function formatAjv(errors) {
	return errors.map((e) => {
		const where = e.instancePath || '(root)';
		const extra = e.params?.allowedValues ? ` (${e.params.allowedValues.join(', ')})` : '';
		const prop = e.params?.additionalProperty ?? e.params?.unevaluatedProperty;
		return `${where} ${e.message}${extra}${prop ? `: "${prop}"` : ''}`;
	});
}

/**
 * Runs every check. Returns the loaded data too, so build-data.js validates and builds in one pass.
 * @returns {{ errors: string[], warnings: string[], articles: any[], taxonomy: Record<string, any[]>, references: any[] }}
 */
export function validate() {
	const errors = [];
	const warnings = [];
	const schemas = loadSchemas();

	const { taxonomy, errors: taxErrors } = loadTaxonomy();
	const { articles, errors: articleErrors } = loadArticles();
	errors.push(...taxErrors, ...articleErrors);

	// Taxonomy: schema, duplicate ids, parents, alias collisions.
	for (const [key, { file, schema }] of Object.entries(REGISTRIES)) {
		const terms = taxonomy[key];
		const check = schemas.taxonomy(schema);
		if (!check(terms)) {
			for (const msg of formatAjv(check.errors)) errors.push(`data/taxonomy/${file}: ${msg}`);
		}
		const ids = new Set();
		const names = new Map();
		for (const term of terms) {
			if (ids.has(term.id)) errors.push(`data/taxonomy/${file}: duplicate id "${term.id}"`);
			ids.add(term.id);
			for (const name of [term.label, ...(term.aliases ?? [])]) {
				const norm = name.toLowerCase();
				const owner = names.get(norm);
				if (owner && owner !== term.id) {
					errors.push(`data/taxonomy/${file}: "${name}" is used by both "${owner}" and "${term.id}"`);
				}
				names.set(norm, term.id);
			}
		}
		for (const term of terms) {
			if (!term.parent) continue;
			const parent = terms.find((t) => t.id === term.parent);
			if (!parent) errors.push(`data/taxonomy/${file}: "${term.id}" has unknown parent "${term.parent}"`);
			else if (parent.parent) errors.push(`data/taxonomy/${file}: "${term.id}" is nested more than 2 levels`);
		}
		// Subcircuits and functions are shown in sidebar groups; a term without one would be hidden.
		if (key === 'subcircuits' || key === 'functions') {
			for (const term of terms) {
				if (!term.group) warnings.push(`data/taxonomy/${file}: "${term.id}" has no group`);
			}
		}
	}

	const index = indexTaxonomy(taxonomy);
	for (const product of taxonomy.products) {
		if (!index.manufacturers.has(product.manufacturer)) {
			errors.push(`data/taxonomy/products.json: "${product.id}" has unknown manufacturer "${product.manufacturer}"`);
		}
	}
	for (const c of taxonomy.components) {
		for (const alt of c.alternatives ?? []) {
			if (!index.components.has(alt)) errors.push(`data/taxonomy/components.json: "${c.id}" lists unknown alternative "${alt}"`);
		}
	}

	// Articles.
	const titles = new Map();
	const urls = new Map();
	const used = Object.fromEntries(Object.keys(REGISTRIES).map((k) => [k, new Set()]));

	for (const { id, file, data } of articles) {
		if (!ARTICLE_ID.test(id)) {
			errors.push(`${file}: file name must be lowercase-kebab-case (e.g. korg-ms20-filter-study.json)`);
		}
		if (!schemas.article(data)) {
			for (const msg of formatAjv(schemas.article.errors)) errors.push(`${file}: ${msg}`);
		}
		// Reference and duplicate checks still run on schema-invalid articles, as far as their shape allows.
		const list = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []);

		for (const [key, { field }] of Object.entries(REGISTRIES)) {
			list(data[field]).forEach((ref, i) => {
				used[key].add(ref);
				if (index[key].has(ref)) return;
				const hint = suggest(ref, taxonomy[key]);
				errors.push(
					`${file}: ${field}[${i}] "${ref}" unknown in data/taxonomy/${REGISTRIES[key].file}` +
						(hint ? ` — did you mean "${hint}"?` : '')
				);
			});
		}

		for (const productId of list(data.products)) {
			const product = index.products.get(productId);
			if (product && !list(data.manufacturers).includes(product.manufacturer)) {
				errors.push(`${file}: product "${productId}" is made by "${product.manufacturer}", add it to manufacturers`);
			}
		}

		if (typeof data.title === 'string') {
			const titleKey = data.title.toLowerCase();
			if (titles.has(titleKey)) warnings.push(`${file}: same title as ${titles.get(titleKey)}`);
			titles.set(titleKey, file);
		}

		// One article per link: the same URL twice means two files describe one resource.
		if (typeof data.url === 'string') {
			if (urls.has(data.url)) errors.push(`${file}: same url as ${urls.get(data.url)}: ${data.url}`);
			urls.set(data.url, file);
		}

		if (data.summaryFromGroup) {
			warnings.push(`${file}: summary was written for a former group of links; rewrite it for this article`);
		}

		if (data.reviewed && data.reviewed < data.added) {
			errors.push(`${file}: "reviewed" (${data.reviewed}) is before "added" (${data.added})`);
		}
	}

	// Reference Shelf: schema, unique ids and urls, no site that is also an article.
	const { references, errors: refErrors } = loadReferences();
	errors.push(...refErrors);
	if (!schemas.references(references)) {
		for (const msg of formatAjv(schemas.references.errors)) errors.push(`data/references.json: ${msg}`);
	}
	const refIds = new Set();
	const refUrls = new Set();
	for (const r of references) {
		if (refIds.has(r.id)) errors.push(`data/references.json: duplicate id "${r.id}"`);
		if (refUrls.has(r.url)) errors.push(`data/references.json: duplicate url ${r.url}`);
		if (urls.has(r.url)) errors.push(`data/references.json: "${r.id}" is also an article (${urls.get(r.url)}); keep one`);
		refIds.add(r.id);
		refUrls.add(r.url);
	}

	// Unused terms are fine for broad registries; only flag the ones meant to be discovered through articles.
	for (const key of ['subcircuits', 'functions', 'components']) {
		const parents = new Set(taxonomy[key].map((t) => t.parent).filter(Boolean));
		for (const term of taxonomy[key]) {
			if (!used[key].has(term.id) && !parents.has(term.id)) {
				warnings.push(`data/taxonomy/${REGISTRIES[key].file}: "${term.id}" is not used by any article`);
			}
		}
	}

	return { errors, warnings, articles, taxonomy, references };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
	const { errors, warnings, articles } = validate();
	const verbose = process.argv.includes('--verbose');
	if (verbose) for (const w of warnings) console.warn(`warn  ${w}`);
	for (const e of errors) console.error(`error ${e}`);
	console.log(
		`${articles.length} articles, ${errors.length} errors, ${warnings.length} warnings` +
			(warnings.length && !verbose ? ' (--verbose to list)' : '')
	);
	process.exit(errors.length ? 1 : 0);
}
