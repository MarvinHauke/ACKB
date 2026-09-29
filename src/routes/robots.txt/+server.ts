// robots.txt, prerendered so the Sitemap line follows the configured site URL.
import { absolute } from '$lib/server/seo';

export const prerender = true;

export const GET = () =>
	new Response(`# allow crawling everything by default\nUser-agent: *\nDisallow:\n\nSitemap: ${absolute('/sitemap.xml')}\n`, {
		headers: { 'Content-Type': 'text/plain' }
	});
