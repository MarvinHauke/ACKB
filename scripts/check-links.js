// Checks every external URL (article links + IC datasheets) and writes data/link-health.json.
// Broken links are reported as warnings, never as a failing exit code.
//
// Usage:
//   node scripts/check-links.js                     check all URLs
//   node scripts/check-links.js --changed origin/main   only URLs of articles changed since a git ref
//   node scripts/check-links.js --files data/articles/a.json …
//
// Politeness: one request at a time per host, a pause between requests to the same host,
// a few hosts in parallel. For links that aren't OK, the Wayback Machine is asked for a snapshot.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { DATA_DIR, ROOT, loadArticles, loadReferences, loadTaxonomy } from './lib/data.js';
import { TIMEOUT_MS, USER_AGENT, check } from './lib/fetch.js';

const OUT = join(DATA_DIR, 'link-health.json');
const HOST_DELAY_MS = 1_000;
const PARALLEL_HOSTS = 4;

const args = process.argv.slice(2);
const today = new Date().toISOString().slice(0, 10);

function selectedFiles() {
	const i = args.indexOf('--changed');
	if (i !== -1) {
		const ref = args[i + 1] ?? 'origin/main';
		const out = execFileSync('git', ['diff', '--name-only', ref, '--', 'data/articles'], { cwd: ROOT, encoding: 'utf8' });
		return new Set(out.split('\n').filter(Boolean));
	}
	const j = args.indexOf('--files');
	if (j !== -1) return new Set(args.slice(j + 1).map((f) => resolve(f).slice(ROOT.length)));
	return null;
}

/** url → list of places it is used ("data/articles/x.json", "component:lm13700", "reference:x"). */
function collectUrls(files) {
	const urls = new Map();
	const add = (url, where) => urls.set(url, [...(urls.get(url) ?? []), where]);
	for (const { file, data } of loadArticles().articles) {
		if (files && !files.has(file)) continue;
		if (data.url) add(data.url, file);
	}
	if (!files) {
		for (const c of loadTaxonomy().taxonomy.components) {
			if (c.datasheetUrl) add(c.datasheetUrl, `component:${c.id}`);
			for (const s of c.successors ?? []) if (s.url) add(s.url, `component:${c.id}:${s.part}`);
		}
		for (const r of loadReferences().references) add(r.url, `reference:${r.id}`);
	}
	return urls;
}

async function waybackSnapshot(url) {
	try {
		const res = await fetch(`https://archive.org/wayback/available?url=${encodeURIComponent(url)}`, {
			headers: { 'user-agent': USER_AGENT },
			signal: AbortSignal.timeout(TIMEOUT_MS)
		});
		const snap = (await res.json())?.archived_snapshots?.closest;
		return snap?.available ? snap.url.replace(/^http:/, 'https:') : null;
	} catch {
		return null;
	}
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
	const files = selectedFiles();
	const urls = collectUrls(files);
	const previous = new Map();
	if (existsSync(OUT)) for (const l of JSON.parse(readFileSync(OUT, 'utf8')).links ?? []) previous.set(l.url, l);

	// Group by host so each host gets a sequential queue.
	const byHost = new Map();
	for (const url of urls.keys()) {
		const host = new URL(url).host;
		byHost.set(host, [...(byHost.get(host) ?? []), url]);
	}
	const hosts = [...byHost.keys()];
	const results = new Map();

	async function worker() {
		for (let host; (host = hosts.shift()); ) {
			for (const url of byHost.get(host)) {
				const r = await check(url);
				const prev = previous.get(url);
				const ok = r.status === 'ok' || r.status === 'redirect';
				const archiveUrl = ok ? (prev?.archiveUrl ?? null) : ((await waybackSnapshot(url)) ?? prev?.archiveUrl ?? null);
				results.set(url, {
					url,
					...r,
					lastChecked: today,
					lastOk: ok ? today : (prev?.lastOk ?? null),
					archiveUrl,
					usedBy: urls.get(url)
				});
				console.log(`${r.status.padEnd(8)} ${r.httpStatus ?? '---'} ${url}${r.redirects ? ` (${r.redirects} redirects)` : ''}`);
				await sleep(HOST_DELAY_MS);
			}
		}
	}
	await Promise.all(Array.from({ length: PARALLEL_HOSTS }, worker));

	// Partial runs keep earlier results; full runs drop URLs that are no longer referenced.
	const merged = files ? new Map([...previous, ...results]) : results;
	const links = [...merged.values()].sort((a, b) => a.url.localeCompare(b.url));
	writeFileSync(OUT, JSON.stringify({ generatedAt: new Date().toISOString(), links }, null, '\t') + '\n');

	const bad = [...results.values()].filter((l) => l.status === 'broken' || l.status === 'timeout');
	const gha = !!process.env.GITHUB_ACTIONS;
	for (const l of bad) {
		const msg = `${l.status} (${l.httpStatus ?? l.error}): ${l.url} used by ${l.usedBy.join(', ')}${l.archiveUrl ? ` — archive: ${l.archiveUrl}` : ''}`;
		console.warn(gha ? `::warning title=Broken link::${msg}` : `warn  ${msg}`);
	}
	const count = (s) => [...results.values()].filter((l) => l.status === s).length;
	console.log(
		`check-links: ${results.size} URLs · ok ${count('ok')} · redirect ${count('redirect')} · blocked ${count('blocked')} · broken ${count('broken')} · timeout ${count('timeout')}`
	);
}

main();
