// HTTP helpers shared by check-links.js and check-sources.js.
export const USER_AGENT = 'ACKB-link-checker/1.0 (+https://github.com/MarvinHauke/ackb; static knowledge base link check)';
export const TIMEOUT_MS = 15_000;
const MAX_REDIRECTS = 8;

export async function request(url, method) {
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
export async function check(url) {
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

/** Page text and meta description of an HTML page (for the "own words" check), or null. */
export async function fetchPage(url) {
	try {
		const res = await fetch(url, {
			headers: { 'user-agent': USER_AGENT, accept: 'text/html' },
			signal: AbortSignal.timeout(TIMEOUT_MS)
		});
		if (!res.ok || !(res.headers.get('content-type') ?? '').includes('html')) {
			await res.body?.cancel();
			return null;
		}
		const html = await res.text();
		const meta = (name) =>
			html.match(new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']*)`, 'i'))?.[1] ?? '';
		const text = html
			.replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
			.replace(/<[^>]+>/g, ' ')
			.replace(/&[a-z#0-9]+;/gi, ' ');
		return { description: `${meta('description')} ${meta('og:description')}`, text };
	} catch {
		return null;
	}
}
