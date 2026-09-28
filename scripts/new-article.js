// Scaffolds a new article file (one per link): node scripts/new-article.js "Building a DIY Eurorack MS-20 Lowpass Filter"
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ARTICLES_DIR } from './lib/data.js';

const title = process.argv.slice(2).join(' ').trim();
if (!title) {
	console.error('usage: npm run new -- "Article title"');
	process.exit(1);
}

const id = title
	.normalize('NFKD')
	.replace(/[̀-ͯ]/g, '')
	.toLowerCase()
	.replace(/[^a-z0-9]+/g, '-')
	.replace(/^-|-$/g, '');
const path = join(ARTICLES_DIR, `${id}.json`);
if (existsSync(path)) {
	console.error(`data/articles/${id}.json already exists`);
	process.exit(1);
}

const article = {
	$schema: '../../schema/article.schema.json',
	schemaVersion: 3,
	title,
	url: 'https://',
	type: 'website',
	authors: [],
	summary: '',
	manufacturers: [],
	products: [],
	modules: [],
	subcircuits: [],
	functions: [],
	components: [],
	kinds: [],
	added: new Date().toISOString().slice(0, 10)
};
writeFileSync(path, JSON.stringify(article, null, '\t') + '\n');
console.log(`created data/articles/${id}.json. Fill it in, then run npm run validate`);
