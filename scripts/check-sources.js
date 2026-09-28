// Rules for new and changed articles (docs/source-rules.md). Runs in CI on every PR; errors fail it.
//
// Usage:
//   node scripts/check-sources.js --base origin/main   articles changed since that ref (CI)
//   node scripts/check-sources.js --all                every article, as if new (audit)
//
// "New" means the URL doesn't exist on the base ref yet. The strict rules (tagging, own words,
// https) apply to new articles; everything changed is checked for duplicates, filter fit and links.
import { execFileSync } from 'node:child_process';
import { ROOT, REGISTRIES, indexTaxonomy, loadArticles, loadTaxonomy } from './lib/data.js';
import { check, fetchPage } from './lib/fetch.js';

const args = process.argv.slice(2);
const all = args.includes('--all');
const base = args[args.indexOf('--base') + 1] ?? 'origin/main';
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8' });

const TRACKING = /^(utm_[a-z]+|fbclid|gclid|mc_[a-z]+|ref|si|igshid)$/i;
const SHORTENERS = new Set(['bit.ly', 't.co', 'tinyurl.com', 'goo.gl', 'ow.ly', 'buff.ly', 'is.gd', 'rebrand.ly', 'youtu.be']);
const SHINGLE = 8; // words in a row that count as copied
const GROUP_MAX = 12;

/** Comparable form of a URL: no www., no trailing slash, no tracking parameters, no fragment. */
function normalize(url) {
	const u = new URL(url);
	for (const key of [...u.searchParams.keys()]) if (TRACKING.test(key)) u.searchParams.delete(key);
	return `${u.hostname.replace(/^www\./, '')}${u.pathname.replace(/\/+$/, '')}${u.search}`.toLowerCase();
}

/** URLs on the base ref (old data/entries layout included), to tell new articles from existing ones. */
function baseUrls() {
	const urls = new Set();
	let files = [];
	try {
		files = git('ls-tree', '-r', '--name-only', base, '--', 'data/articles', 'data/entries').split('\n').filter((f) => f.endsWith('.json'));
	} catch {
		return urls;
	}
	for (const f of files) {
		try {
			const d = JSON.parse(git('show', `${base}:${f}`));
			if (d.url) urls.add(d.url);
			for (const s of d.sources ?? []) urls.add(s.url);
		} catch {
			// unreadable file on base: ignore
		}
	}
	return urls;
}

function changedFiles() {
	if (all) return null;
	// Changed since the base, plus new files not added to git yet (local runs before a commit).
	const tracked = git('diff', '--name-only', base, '--', 'data/articles');
	const untracked = git('ls-files', '--others', '--exclude-standard', '--', 'data/articles');
	return new Set(`${tracked}\n${untracked}`.split('\n').filter(Boolean));
}

const words = (s) => s.toLowerCase().replace(/[^a-z0-9äöüß]+/g, ' ').trim().split(' ').filter(Boolean);
function sharedRun(summary, source) {
	const w = words(summary);
	const hay = ` ${words(source).join(' ')} `;
	for (let i = 0; i + SHINGLE <= w.length; i++) {
		const run = w.slice(i, i + SHINGLE).join(' ');
		if (hay.includes(` ${run} `)) return run;
	}
	return null;
}

async function main() {
	const errors = [];
	const warnings = [];
	const { taxonomy } = loadTaxonomy();
	const index = indexTaxonomy(taxonomy);
	const { articles } = loadArticles();
	const changed = changedFiles();
	const onBase = all ? new Set() : baseUrls();
	const targets = articles.filter((a) => !changed || changed.has(a.file));
	const today = new Date().toISOString().slice(0, 10);

	// Rule 2: duplicates after normalizing, tracking parameters, shorteners.
	const byNorm = new Map();
	for (const a of articles) {
		if (!a.data.url) continue;
		const n = normalize(a.data.url);
		byNorm.set(n, [...(byNorm.get(n) ?? []), a.file]);
	}
	const knownHosts = new Set(
		articles.filter((a) => a.data.url && !targets.includes(a)).map((a) => new URL(a.data.url).hostname.replace(/^www\./, ''))
	);

	for (const a of targets) {
		const { file, data } = a;
		if (!data.url) continue;
		const url = new URL(data.url);
		const isNew = !onBase.has(data.url);
		const err = (msg) => errors.push(`${file}: ${msg}`);

		const dupes = byNorm.get(normalize(data.url)).filter((f) => f !== file);
		if (dupes.length) err(`same link as ${dupes.join(', ')} (after removing www./slash/tracking)`);
		const tracking = [...url.searchParams.keys()].filter((k) => TRACKING.test(k));
		if (tracking.length) err(`remove tracking parameters from the url: ${tracking.join(', ')}`);
		if (SHORTENERS.has(url.hostname.replace(/^www\./, ''))) err(`use the full link instead of the short link (${url.hostname})`);

		// Rule 5: the tags it uses fit the filters.
		for (const key of ['subcircuits', 'functions']) {
			for (const id of data[REGISTRIES[key].field] ?? []) {
				const t = index[key].get(id);
				if (t && !t.group) err(`${key} "${id}" has no sidebar group in data/taxonomy/${REGISTRIES[key].file}`);
			}
		}

		if (isNew) {
			// Rule 4: minimum tagging.
			if (!(data.authors ?? []).length && data.origin !== 'manufacturer') err('add an author (or "origin": "manufacturer" for manufacturer documents)');
			if (!['modules', 'subcircuits', 'functions', 'components'].some((k) => (data[k] ?? []).length)) {
				err('tag at least one module, subcircuit, function or component');
			}
			// Rule 6.
			if (data.summaryFromGroup) err('new articles need their own summary (remove "summaryFromGroup")');
			if (data.added > today) err(`"added" (${data.added}) is in the future`);
			const host = url.hostname.replace(/^www\./, '');
			if (!knownHosts.has(host)) {
				knownHosts.add(host); // one warning per new site, not per article
				warnings.push(`${file}: new source ${host}, please check its quality`);
			}
		}

		// Rule 3: the link works (new or changed articles).
		const r = await check(data.url);
		const reachable = r.status === 'ok' || r.status === 'redirect';
		if (!reachable && !(r.status === 'blocked' && data.linkCheck === 'blocked')) {
			err(
				r.status === 'blocked'
					? `the site blocks link checks (HTTP ${r.httpStatus}); check it by hand and add "linkCheck": "blocked"`
					: `link doesn't work: ${r.status} ${r.httpStatus ?? r.error ?? ''}`
			);
		}

		if (isNew && reachable) {
			// Rule 8: https when the site supports it.
			if (url.protocol === 'http:') {
				const https = await check(data.url.replace(/^http:/, 'https:'));
				if (https.status === 'ok' || https.status === 'redirect') err('the page also works over https://, use that url');
			}
			// Rule 7: the summary is in your own words.
			const page = await fetchPage(data.url);
			if (page) {
				const run = sharedRun(data.summary ?? '', `${page.description} ${page.text}`);
				if (run) err(`summary copies text from the page ("${run}…"); write it in your own words`);
			} else {
				warnings.push(`${file}: couldn't read the page, check by hand that the summary is in your own words`);
			}
		}
	}

	// Warning: sidebar groups that grow too long.
	for (const key of ['subcircuits', 'functions']) {
		const used = new Set(articles.flatMap((a) => a.data[REGISTRIES[key].field] ?? []));
		const sizes = new Map();
		for (const t of taxonomy[key]) if (t.group && used.has(t.id)) sizes.set(t.group, (sizes.get(t.group) ?? 0) + 1);
		for (const [g, n] of sizes) if (n > GROUP_MAX) warnings.push(`${key} group "${g}" has ${n} entries, consider a subgroup`);
	}

	for (const w of warnings) console.warn(`warn  ${w}`);
	for (const e of errors) console.error(`error ${e}`);
	console.log(`check-sources: ${targets.length} articles checked, ${errors.length} errors, ${warnings.length} warnings`);
	process.exit(errors.length ? 1 : 0);
}

main();
