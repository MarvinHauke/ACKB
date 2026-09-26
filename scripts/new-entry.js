// Scaffolds a new entry file: node scripts/new-entry.js "Moog ladder filter analysis"
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ENTRIES_DIR } from './lib/data.js';

const title = process.argv.slice(2).join(' ').trim();
if (!title) {
	console.error('usage: npm run new -- "Entry title"');
	process.exit(1);
}

const id = title
	.normalize('NFKD')
	.replace(/[̀-ͯ]/g, '')
	.toLowerCase()
	.replace(/[^a-z0-9]+/g, '-')
	.replace(/^-|-$/g, '');
const path = join(ENTRIES_DIR, `${id}.json`);
if (existsSync(path)) {
	console.error(`data/entries/${id}.json already exists`);
	process.exit(1);
}

const entry = {
	$schema: '../../schema/entry.schema.json',
	schemaVersion: 1,
	title,
	summary: '',
	manufacturers: [],
	products: [],
	circuitTypes: [],
	subcircuits: [],
	functions: [],
	ics: [],
	difficulty: 'intermediate',
	confidence: 'community',
	added: new Date().toISOString().slice(0, 10),
	sources: [{ type: 'website', title: '', url: 'https://' }]
};
writeFileSync(path, JSON.stringify(entry, null, '\t') + '\n');
console.log(`created data/entries/${id}.json. Fill it in, then run npm run validate`);
