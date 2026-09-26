import { error } from '@sveltejs/kit';
import { catalog } from '$lib/server/catalog';
import type { EntryGenerator } from './$types';

export const entries: EntryGenerator = () => catalog.entries.map((e) => ({ id: e.id }));

export function load({ params }) {
	const entry = catalog.entries.find((e) => e.id === params.id);
	if (!entry) error(404, 'Entry not found');
	return { entry };
}
