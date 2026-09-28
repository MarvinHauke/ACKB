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
import { DATA_DIR, ROOT, loadArticles, loadTaxonomy } from './lib/data.js';

const OUT = join(DATA_DIR, 'link-health.json');
const USER_AGENT = 'ACKB-link-checker/1.0 (+https://github.com; static knowledge base link check)';
const TIMEOUT_MS = 15_000;
const HOST_DELAY_MS = 1_000;
const PARALLEL_HOSTS = 4;
const MAX_REDIRECTS = 8;

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

/** url → list of places it is used ("data/articles/x.json", "ic:lm13700"). */
function collectUrls(files) {
	const urls = new Map();
	const add = (url, where) => urls.set(url, [...(urls.get(url) ?? []), where]);
	for (const { file, data } of loadArticles().articles) {
		if (files && !files.has(file)) continue;
		if (data.url) add(data.url, file);
	}
	if (!files) {
		for (const ic of loadTaxonomy().taxonomy.ics) if (ic.datasheetUrl) add(ic.datasheetUrl, `ic:${ic.id}`);
	}
	return urls;
}

async function request(url, method) {
	const ctrl = new AbortController();
	const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
	try {
		const res = await fetch(url, {
			method,
			redirect: 'manual',
			signal: ctrl.signal,
			headers: { 'user-agent': USER_AGENT, accept: '*/*' }
		});
		// Don't download bodies (PDFs can be large).
		await res.body?.cancel();
		return res;
	} finally {
		clearTimeout(timer);
	}
}

/** HEAD first (GET if the server rejects HEAD), following redirects by hand to count them. */
async function check(url) {
	let current = url;
	let redirects = 0;
	try {
		for (;;) {
			let res = await request(current, 'HEAD');
			if ([400, 403, 404, 405, 501].includes(res.status)) res = await request(current, 'GET');
			const location = res.headers.get('location');
			if (res.status >= 300 && res.status < 400 && location) {
				if (++redirects > MAX_REDIRECTS) return { status: 'broken', httpStatus: res.status, redirects, finalUrl: current, error: 'too many redirects' };
				current = new URL(location, current).href;
				continue;
			}
			const status =
				res.status < 300 ? (redirects ? 'redirect' : 'ok') : [401, 403, 429].includes(res.status) ? 'blocked' : 'broken';
			return { status, httpStatus: res.status, redirects, finalUrl: current };
		}
	} catch (err) {
		const timeout = err.name === 'AbortError' || err.name === 'TimeoutError';
		return { status: timeout ? 'timeout' : 'broken', httpStatus: null, redirects, finalUrl: current, error: String(err.cause?.code ?? err.message) };
	}
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
