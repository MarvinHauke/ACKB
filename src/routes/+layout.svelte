<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { asset, resolve } from '$app/paths';

	let { children } = $props();

	// GoatCounter endpoint, e.g. https://ackb.goatcounter.com/count. Unset = no analytics at all.
	const goatcounter: string | undefined = import.meta.env.VITE_GOATCOUNTER_URL;

	type GoatCounter = { count: (vars: { path: string; title: string; event: boolean }) => void };

	onMount(() => {
		if (!goatcounter) return;
		// Only outbound resource clicks are counted: no page views, no cookies.
		(window as unknown as { goatcounter: object }).goatcounter = { no_onload: true };
		const script = document.createElement('script');
		script.async = true;
		script.src = 'https://gc.zgo.at/count.js';
		script.dataset.goatcounter = goatcounter;
		document.head.append(script);

		const onClick = (event: MouseEvent) => {
			const link = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[data-out]');
			const gc = (window as unknown as { goatcounter?: Partial<GoatCounter> }).goatcounter;
			if (!link || !gc?.count) return;
			gc.count({ path: `out/${link.dataset.out}/${link.href}`, title: link.textContent?.trim() ?? '', event: true });
		};
		document.addEventListener('click', onClick);
		return () => document.removeEventListener('click', onClick);
	});
</script>

<svelte:head>
	<link rel="icon" type="image/png" href={asset('/favicon.png')} />
	<link rel="apple-touch-icon" href={asset('/apple-touch-icon.png')} />
</svelte:head>

<header>
	<nav>
		<a class="brand" href={resolve('/')}>ACKB <span>Analog Circuit Knowledge Base</span></a>
	</nav>
</header>

<main>
	{@render children()}
</main>

<footer class="muted">
	External resources stay with their authors; this index only links to them.
	<a href={asset('/data/kb.jsonl')}>kb.jsonl</a> · <a href={asset('/data/graph.json')}>graph.json</a> ·
	<a href={asset('/data/taxonomy.json')}>taxonomy.json</a> ·
	<a href={asset('/llms.txt')}>llms.txt</a>
	<p class="optout">
		Your page is listed here and you'd rather it wasn't, or a link is wrong?
		<a href="mailto:info@irregular-instruments.com?subject=ACKB%20listing">Write to us</a> and we'll change or
		remove it.
	</p>
	<p>
		<a
			href="https://github.com/MarvinHauke/ackb/issues/new?template=suggest-resource.md"
			target="_blank"
			rel="noopener external">Suggest a resource ↗</a
		>
		<span class="visually-hidden">(opens in a new tab)</span>
	</p>
	<p class="legal">
		<a href="https://irregular-instruments.com/impressum">Impressum</a> ·
		<a href="https://irregular-instruments.com/datenschutz">Datenschutz</a>
	</p>
</footer>

<style>
	footer p {
		margin: 0.5rem 0 0;
	}

	header {
		border-bottom: 1px solid var(--line);
		background: var(--panel);
	}

	nav,
	main,
	footer {
		max-width: 64rem;
		margin: 0 auto;
		padding: 0 1rem;
	}

	nav {
		display: flex;
		align-items: baseline;
		gap: 1.5rem;
		padding-block: 0.6rem;
	}

	.brand {
		font-family: var(--mono);
		font-weight: 700;
		color: var(--fg);
		text-decoration: none;
		margin-right: auto;
	}

	.brand span {
		font-family: var(--sans);
		font-weight: 400;
		color: var(--muted);
		margin-left: 0.5rem;
	}

	main {
		padding-block: 1rem 3rem;
		min-height: 70vh;
	}

	footer {
		border-top: 1px solid var(--line);
		padding-block: 1rem 2rem;
		font-size: 0.85rem;
	}

	@media (max-width: 30rem) {
		.brand span {
			display: none;
		}
	}
</style>
