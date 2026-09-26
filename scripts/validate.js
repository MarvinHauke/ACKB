// Validates data/: JSON syntax, JSON Schema, entry ids, referential integrity and duplicates.
// Usage: node scripts/validate.js   (exit code 1 on errors; warnings never fail)
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import {
	ENTRY_ID,
	REGISTRIES,
	ROOT,
	indexTaxonomy,
	loadEntries,
	loadTaxonomy,
	suggest
} from './lib/data.js';

function loadSchemas() {
	const ajv = new Ajv2020({ allErrors: true, strict: false });
	addFormats(ajv);
	const read = (p) => JSON.parse(readFileSync(join(ROOT, 'schema', p), 'utf8'));
	for (const name of ['term', 'product', 'ic', 'subcircuit']) {
		ajv.addSchema(read(`taxonomy/${name}.schema.json`));
	}
	return {
		entry: ajv.compile(read('entry.schema.json')),
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
 * @returns {{ errors: string[], warnings: string[], entries: any[], taxonomy: Record<string, any[]> }}
 */
export function validate() {
	const errors = [];
	const warnings = [];
	const schemas = loadSchemas();

	const { taxonomy, errors: taxErrors } = loadTaxonomy();
	const { entries, errors: entryErrors } = loadEntries();
	errors.push(...taxErrors, ...entryErrors);

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
	}

	const index = indexTaxonomy(taxonomy);
	for (const product of taxonomy.products) {
		if (!index.manufacturers.has(product.manufacturer)) {
			errors.push(`data/taxonomy/products.json: "${product.id}" has unknown manufacturer "${product.manufacturer}"`);
		}
	}
	for (const ic of taxonomy.ics) {
		for (const alt of ic.alternatives ?? []) {
			if (!index.ics.has(alt)) errors.push(`data/taxonomy/ics.json: "${ic.id}" lists unknown alternative "${alt}"`);
		}
	}

	// Entries.
	const titles = new Map();
	const urls = new Map();
	const used = Object.fromEntries(Object.keys(REGISTRIES).map((k) => [k, new Set()]));

	for (const { id, file, data } of entries) {
		if (!ENTRY_ID.test(id)) {
			errors.push(`${file}: file name must be lowercase-kebab-case (e.g. korg-ms20-filter.json)`);
		}
		if (!schemas.entry(data)) {
			for (const msg of formatAjv(schemas.entry.errors)) errors.push(`${file}: ${msg}`);
		}
		// Reference and duplicate checks still run on schema-invalid entries, as far as their shape allows.
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
			if (titles.has(titleKey)) errors.push(`${file}: duplicate title, also used in ${titles.get(titleKey)}`);
			titles.set(titleKey, file);
		}

		const seen = new Set();
		for (const source of Array.isArray(data.sources) ? data.sources.filter((x) => x?.url) : []) {
			if (seen.has(source.url)) errors.push(`${file}: source listed twice: ${source.url}`);
			seen.add(source.url);
			if (urls.has(source.url) && urls.get(source.url) !== file) {
				warnings.push(`${file}: source also used in ${urls.get(source.url)}: ${source.url}`);
			}
			urls.set(source.url, file);
		}

		if (data.reviewed && data.reviewed < data.added) {
			errors.push(`${file}: "reviewed" (${data.reviewed}) is before "added" (${data.added})`);
		}
	}

	// Unused terms are fine for broad registries; only flag the ones meant to be discovered through entries.
	for (const key of ['subcircuits', 'functions', 'ics']) {
		const parents = new Set(taxonomy[key].map((t) => t.parent).filter(Boolean));
		for (const term of taxonomy[key]) {
			if (!used[key].has(term.id) && !parents.has(term.id)) {
				warnings.push(`data/taxonomy/${REGISTRIES[key].file}: "${term.id}" is not used by any entry`);
			}
		}
	}

	return { errors, warnings, entries, taxonomy };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
	const { errors, warnings, entries } = validate();
	const verbose = process.argv.includes('--verbose');
	if (verbose) for (const w of warnings) console.warn(`warn  ${w}`);
	for (const e of errors) console.error(`error ${e}`);
	console.log(
		`${entries.length} entries, ${errors.length} errors, ${warnings.length} warnings` +
			(warnings.length && !verbose ? ' (--verbose to list)' : '')
	);
	process.exit(errors.length ? 1 : 0);
}
