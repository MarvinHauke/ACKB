<script lang="ts">
	// Search field with the active filters and search terms as removable chips on its right.
	// Typing "," turns the text before it into a chip (a tag when it matches a label or alias, else a
	// text term). Suggestions (recent filters, or matching tags while typing) open as an overlay.
	import type { FilterKey } from '$lib/filters';

	export type TagEntry = { key: FilterKey; id: string; label: string; aliases: string[]; type: string; count: number };
	type Chip = { kind: 'text'; index: number; label: string } | { kind: 'tag'; key: FilterKey; id: string; label: string; type?: string };

	let {
		value = $bindable(''),
		texts,
		tags,
		entries,
		recent,
		labels,
		failed,
		onchange,
		onfocus,
		onaddtag,
		onremovetag,
		onaddtext,
		onremovetext
	}: {
		/** The live text (searched while typing). */
		value: string;
		/** Committed text chips. */
		texts: string[];
		/** Active tag filters. */
		tags: { key: FilterKey; id: string; label: string; type?: string }[];
		/** All tags that can be looked up by label or alias, in priority order. */
		entries: TagEntry[];
		recent: { key: FilterKey; id: string }[];
		labels: Map<string, string>;
		failed: boolean;
		onchange: () => void;
		onfocus: () => void;
		onaddtag: (key: FilterKey, id: string) => void;
		onremovetag: (key: FilterKey, id: string) => void;
		onaddtext: (text: string) => void;
		onremovetext: (index: number) => void;
	} = $props();

	const MAX_CHIPS = 4;
	const MAX_SUGGESTIONS = 8;

	let focused = $state(false);
	let dismissed = $state(false);
	let active = $state(-1);
	let moreOpen = $state(false);
	let moreButton: HTMLButtonElement | undefined = $state();

	const chips: Chip[] = $derived([
		...texts.map((t, i) => ({ kind: 'text' as const, index: i, label: t })),
		...tags.map((t) => ({ kind: 'tag' as const, key: t.key, id: t.id, label: t.label, type: t.type }))
	]);
	const shownChips = $derived(chips.slice(0, MAX_CHIPS));
	const hiddenChips = $derived(chips.slice(MAX_CHIPS));

	const isActive = (key: FilterKey, id: string) => tags.some((t) => t.key === key && t.id === id);

	type Option = { key: FilterKey; id: string; label: string; type?: string };
	const options: Option[] = $derived.by(() => {
		const text = value.trim().toLowerCase();
		if (!text) {
			return recent
				.filter((r) => !isActive(r.key, r.id))
				.map((r) => ({
					key: r.key,
					id: r.id,
					label: labels.get(r.id) ?? r.id,
					type: entries.find((e) => e.key === r.key && e.id === r.id)?.type
				}));
		}
		const score = (e: TagEntry) => {
			const names = [e.label, ...e.aliases].map((n) => n.toLowerCase());
			if (names.some((n) => n === text)) return 0;
			if (names.some((n) => n.startsWith(text))) return 1;
			if (names.some((n) => n.split(/[\s\-/]+/).some((w) => w.startsWith(text)))) return 2;
			return names.some((n) => n.includes(text)) ? 3 : 4;
		};
		return entries
			.filter((e) => !isActive(e.key, e.id) && score(e) < 4)
			.sort((a, b) => score(a) - score(b) || b.count - a.count)
			.slice(0, MAX_SUGGESTIONS)
			.map((e) => ({ key: e.key, id: e.id, label: e.label, type: e.type }));
	});
	const open = $derived(focused && !dismissed && options.length > 0);

	/** Label or alias (case-insensitive) → tag; the entries' order decides between registries. */
	function lookup(text: string) {
		const t = text.trim().toLowerCase();
		return entries.find((e) => e.label.toLowerCase() === t || e.aliases.some((a) => a.toLowerCase() === t));
	}

	function commit(text: string) {
		const t = text.trim();
		if (!t) return;
		const hit = lookup(t);
		if (hit) {
			if (!isActive(hit.key, hit.id)) onaddtag(hit.key, hit.id);
		} else if (!texts.includes(t)) onaddtext(t);
	}

	function oninput() {
		dismissed = false;
		active = -1;
		if (value.includes(',')) {
			const parts = value.split(',');
			value = parts.pop() ?? '';
			parts.forEach(commit);
		}
		onchange();
	}

	function pick(o: Option) {
		value = '';
		active = -1;
		onaddtag(o.key, o.id);
		onchange();
	}

	function remove(c: Chip) {
		const fromMore = hiddenChips.includes(c);
		if (c.kind === 'text') onremovetext(c.index);
		else onremovetag(c.key, c.id);
		// The list closes with its last chip: keep focus in the field instead of losing it.
		if (fromMore && hiddenChips.length <= 1) {
			moreOpen = false;
			document.getElementById('q')?.focus();
		}
	}

	function onkeydown(e: KeyboardEvent) {
		if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
			if (!options.length) return;
			e.preventDefault();
			dismissed = false;
			const step = e.key === 'ArrowDown' ? 1 : -1;
			active = active === -1 ? (step === 1 ? 0 : options.length - 1) : (active + step + options.length) % options.length;
		} else if (e.key === 'Enter' && open && active >= 0) {
			e.preventDefault();
			pick(options[active]);
		} else if (e.key === 'Enter' && value.trim()) {
			e.preventDefault();
			commit(value);
			value = '';
			active = -1;
			onchange();
		} else if (e.key === 'Escape') {
			dismissed = true;
			moreOpen = false;
			active = -1;
		} else if (e.key === 'Backspace' && value === '' && chips.length) {
			e.preventDefault();
			remove(chips[chips.length - 1]);
		}
	}
</script>

<search class="searchbar">
	<label class="visually-hidden" for="q">Search</label>
	<div class="field" class:focus={focused}>
		<input
			id="q"
			type="text"
			enterkeyhint="search"
			placeholder="Search: MS-20, LM13700, soft clipping, buffer …"
			autocomplete="off"
			spellcheck="false"
			role="combobox"
			aria-expanded={open}
			aria-controls={open ? 'suggestions' : undefined}
			aria-autocomplete="list"
			aria-activedescendant={open && active >= 0 ? `sg-${active}` : undefined}
			bind:value
			onfocus={() => {
				onfocus();
				focused = true;
				dismissed = false;
			}}
			onblur={() => (focused = false)}
			{oninput}
			{onkeydown}
		/>
		{#if chips.length}
			<ul class="chips barchips" aria-label="Active filters and search terms">
				{#each shownChips as c (c.kind + (c.kind === 'tag' ? c.key + c.id : c.index))}
					<li>
						<button class="chip remove" onclick={() => remove(c)} aria-label="Remove {c.kind === 'text' ? 'search term' : 'filter'} {c.label}"
							>{c.label}{#if c.kind === 'tag' && c.type}<span class="type"> {c.type}</span>{/if} <span aria-hidden="true">×</span></button
						>
					</li>
				{/each}
				{#if hiddenChips.length}
					<li>
						<button
							class="chip"
							bind:this={moreButton}
							aria-expanded={moreOpen}
							aria-controls="more-chips"
							aria-label="{hiddenChips.length} more"
							onkeydown={(e) => e.key === 'Escape' && (moreOpen = false)}
							onclick={() => (moreOpen = !moreOpen)}>+{hiddenChips.length}</button
						>
					</li>
				{/if}
			</ul>
		{/if}
	</div>
	{#if moreOpen && hiddenChips.length}
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -- Esc closes; the buttons inside are the interactive elements -->
		<ul class="chips overlay more" id="more-chips" aria-label="More active filters" onkeydown={(e) => {
				if (e.key !== 'Escape') return;
				moreOpen = false;
				moreButton?.focus();
			}}>
			{#each hiddenChips as c (c.kind + (c.kind === 'tag' ? c.key + c.id : c.index))}
				<li>
					<button class="chip remove" onclick={() => remove(c)} aria-label="Remove {c.kind === 'text' ? 'search term' : 'filter'} {c.label}"
						>{c.label}{#if c.kind === 'tag' && c.type}<span class="type"> {c.type}</span>{/if} <span aria-hidden="true">×</span></button
					>
				</li>
			{/each}
		</ul>
	{/if}
	{#if open}
		<ul class="overlay suggest" id="suggestions" role="listbox" aria-label={value.trim() ? 'Matching tags' : 'Recently used filters'}>
			{#if !value.trim()}<li class="head" role="presentation">Recent filters</li>{/if}
			{#each options as o, i (o.key + o.id)}
				<!-- Keyboard use goes through the combobox input (arrows, Enter), as in the ARIA pattern. -->
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- mousedown keeps focus in the field, so the list stays open for several picks -->
				<li
					id="sg-{i}"
					role="option"
					aria-selected={i === active}
					class:on={i === active}
					onmousedown={(e) => e.preventDefault()}
					onclick={() => pick(o)}
				>
					{o.label}
					{#if o.type}<span class="type">· {o.type}</span>{/if}
				</li>
			{/each}
		</ul>
	{/if}
	{#if failed}<span class="muted">Search index unavailable, using simple matching.</span>{/if}
</search>

<style>
	.searchbar {
		position: relative;
		display: block;
		margin: var(--space-3) 0 var(--space-4);
	}

	.field {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: 0.25rem 0.5rem 0.25rem 0.75rem;
		border: 1px solid var(--line);
		border-radius: 4px;
		background: var(--bg);
	}

	.field.focus {
		outline: 2px solid var(--accent);
		outline-offset: -1px;
	}

	input {
		flex: 1 1 10rem;
		min-width: 8rem;
		font: inherit;
		font-size: 1.1rem;
		padding: 0.35rem 0;
		border: 0;
		background: none;
		color: var(--fg);
		outline: none;
	}

	.barchips {
		flex: 0 1 auto;
		flex-wrap: nowrap;
		margin: 0;
	}

	button.chip {
		font: inherit;
		font-size: 0.85rem;
		cursor: pointer;
		color: inherit;
	}

	.chip.remove {
		border-color: var(--accent);
	}

	.chip.remove .type {
		font-size: 0.75rem;
		color: var(--muted);
	}

	.chip.remove span:not(.type) {
		margin-left: 0.2rem;
		color: var(--muted);
	}

	.chip.remove:hover span {
		color: var(--bad);
	}

	.overlay {
		position: absolute;
		z-index: 2;
		top: calc(100% + 2px);
		left: 0;
		right: 0;
		margin: 0;
		background: var(--panel);
		border: 1px solid var(--line);
		border-radius: 4px;
		box-shadow: 0 4px 12px rgb(0 0 0 / 0.25);
	}

	.more {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1) var(--space-2);
		padding: var(--space-2) var(--space-3);
		list-style: none;
	}

	.suggest {
		list-style: none;
		padding: var(--space-1) 0;
	}

	.suggest li {
		padding: 0.35rem var(--space-3);
		cursor: pointer;
	}

	.suggest .head {
		padding: 0.2rem var(--space-3);
		font-size: 0.75rem;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--muted);
		cursor: default;
	}

	.suggest .type {
		margin-left: 0.25rem;
		font-size: 0.85rem;
		color: var(--muted);
	}

	.suggest li.on,
	.suggest li[role='option']:hover {
		background: var(--hover);
	}

	@media (max-width: 40rem) {
		.field {
			flex-wrap: wrap;
			padding-block: 0.4rem;
		}

		input {
			flex-basis: 100%;
		}

		.barchips {
			flex-wrap: wrap;
		}
	}
</style>
