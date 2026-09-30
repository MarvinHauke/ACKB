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

<footer>
	<div class="cols">
		<div role="group" aria-labelledby="f-contribute">
			<p class="head" id="f-contribute">Contribute</p>
			<ul>
				<li class="cta">
					<a
						href="https://github.com/MarvinHauke/ackb/issues/new?template=suggest-resource.md"
						target="_blank"
						rel="noopener external">Suggest a resource ↗</a
					><span class="visually-hidden"> (opens in a new tab)</span>
				</li>
				<li>
					Is your page listed, or is a link wrong?
					<a href="mailto:info@irregular-instruments.com?subject=ACKB%20listing">Write to us</a> and we'll change or
					remove it.
				</li>
			</ul>
		</div>
		<div role="group" aria-labelledby="f-data">
			<p class="head" id="f-data">Data</p>
			<ul class="files mono">
				<li><a href={asset('/data/kb.jsonl')}>kb.jsonl</a></li>
				<li><a href={asset('/data/graph.json')}>graph.json</a></li>
				<li><a href={asset('/data/taxonomy.json')}>taxonomy.json</a></li>
				<li><a href={asset('/llms.txt')}>llms.txt</a></li>
			</ul>
		</div>
		<div role="group" aria-labelledby="f-about">
			<p class="head" id="f-about">About</p>
			<p class="note">External resources stay with their authors; this index only links to them.</p>
		</div>
	</div>
	<p class="legal">
		<a href="https://irregular-instruments.com/impressum">Impressum</a> ·
		<a href="https://irregular-instruments.com/datenschutz">Datenschutz</a>
	</p>
</footer>

<style>
	.cols {
		display: grid;
		grid-template-columns: 1.4fr 1fr 1.4fr;
		gap: var(--space-4) var(--space-5);
	}

	.head {
		margin: 0 0 var(--space-2);
		font-size: 0.75rem;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--muted);
	}

	footer ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	footer li {
		margin-bottom: var(--space-1);
		color: var(--muted);
	}

	.files {
		font-size: 0.8rem;
	}

	.note {
		margin: 0;
		color: var(--muted);
	}

	.legal {
		margin: var(--space-4) 0 0;
		padding-top: var(--space-3);
		border-top: 1px solid var(--line);
		color: var(--muted);
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

	@media (max-width: 45rem) {
		.cols {
			grid-template-columns: 1fr;
			gap: var(--space-3);
		}

		/* Stacked link: about 44px tall. */
		.cta a {
			display: inline-block;
			padding-block: 0.75rem;
		}

		/* Inline links (file names, legal): at least 24px tall, with room between them. */
		.files {
			display: flex;
			flex-wrap: wrap;
			gap: 0 var(--space-3);
		}

		.files li {
			margin: 0;
		}

		.files a,
		.legal a {
			display: inline-block;
			padding-block: 0.4rem;
		}

		.legal {
			margin-top: var(--space-3);
			padding-top: var(--space-2);
		}
	}

	@media (max-width: 30rem) {
		.brand span {
			display: none;
		}
	}
</style>
