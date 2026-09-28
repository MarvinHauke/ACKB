// Shapes of the files written by scripts/build-data.js.

export type RegistryKey = 'manufacturers' | 'products' | 'circuitTypes' | 'subcircuits' | 'functions' | 'ics';

export type ContentKind = 'build-guide' | 'explanation' | 'analysis' | 'schematic' | 'reference';
export type Confidence = 'official' | 'academic' | 'community';
export type LinkStatus = 'ok' | 'redirect' | 'broken' | 'timeout' | 'blocked' | 'unchecked';

export interface Term {
	id: string;
	label: string;
	aliases?: string[];
	description?: string;
	parent?: string;
	count: number;
	// Registry-specific extras (products, ics, subcircuits).
	manufacturer?: string;
	year?: number;
	category?: string;
	datasheetUrl?: string;
	status?: string;
	alternatives?: string[];
	pdfOcrKind?: string;
	/** Sidebar group (subcircuits, functions). */
	group?: string;
}

export interface TermRef {
	id: string;
	label: string;
}

export interface Source {
	type: string;
	title: string;
	url: string;
	author?: string;
	year?: number;
	lang?: string;
	license?: string;
	note?: string;
	status: LinkStatus;
	archiveUrl: string | null;
}

export interface Related {
	id: string;
	title: string;
	score: number;
	reasons: string[];
}

export interface Entry {
	id: string;
	title: string;
	summary: string;
	kinds: ContentKind[];
	confidence: Confidence;
	added: string;
	reviewed: string | null;
	terms: Record<RegistryKey, TermRef[]>;
	subcircuitParents: string[];
	sources: Source[];
	related: Related[];
}

export type Taxonomy = Record<RegistryKey, Term[]>;

export interface Catalog {
	generatedAt: string;
	entries: Entry[];
	taxonomy: Taxonomy;
}

/** Compact entry for the home page list and client-side filtering. */
export interface EntrySummary {
	id: string;
	title: string;
	summary: string;
	kinds: ContentKind[];
	confidence: Confidence;
	added: string;
	terms: Record<RegistryKey, string[]>;
	/** One item per source, for hiding entries whose sources are all hidden (by type or http). */
	sources: { type: string; secure: boolean }[];
}

export const REGISTRY_KEYS: RegistryKey[] = ['manufacturers', 'products', 'circuitTypes', 'subcircuits', 'functions', 'ics'];

/** URL segment for each registry's pages (/subcircuit/ota_stage) and its display names. */
export const REGISTRY_META: Record<RegistryKey, { slug: string; label: string; plural: string }> = {
	manufacturers: { slug: 'manufacturer', label: 'Manufacturer', plural: 'Manufacturers' },
	products: { slug: 'product', label: 'Product', plural: 'Products' },
	circuitTypes: { slug: 'type', label: 'Module', plural: 'Modules' },
	subcircuits: { slug: 'subcircuit', label: 'Subcircuit', plural: 'Subcircuits' },
	functions: { slug: 'function', label: 'Function', plural: 'Functions' },
	ics: { slug: 'ic', label: 'IC', plural: 'ICs' }
};

export const SLUG_TO_KEY = Object.fromEntries(
	Object.entries(REGISTRY_META).map(([key, meta]) => [meta.slug, key])
) as Record<string, RegistryKey>;

export const CONTENT_KINDS: ContentKind[] = ['build-guide', 'explanation', 'analysis', 'schematic', 'reference'];

export const KIND_LABEL: Record<ContentKind, string> = {
	'build-guide': 'Build guide',
	explanation: 'Explanation',
	analysis: 'Analysis',
	schematic: 'Schematic',
	reference: 'Reference'
};
export const CONFIDENCES: Confidence[] = ['official', 'academic', 'community'];

/** Sidebar groups, in display order. Subcircuits and functions carry `group` in the taxonomy. */
export const TERM_GROUPS: Partial<Record<RegistryKey, { id: string; label: string }[]>> = {
	subcircuits: [
		{ id: 'opamp_stages', label: 'Op-amp stages' },
		{ id: 'transistor_stages', label: 'Transistor & OTA stages' },
		{ id: 'filter_topologies', label: 'Filter topologies' },
		{ id: 'passive_networks', label: 'Passive networks' },
		{ id: 'shaping_dynamics', label: 'Shaping & dynamics' },
		{ id: 'sources', label: 'Oscillator & signal sources' },
		{ id: 'time_switching', label: 'Time, memory & switching' },
		{ id: 'digital_interface', label: 'Digital & interface' },
		{ id: 'power', label: 'Power' }
	],
	functions: [
		{ id: 'filter_response', label: 'Filter response' },
		{ id: 'distortion_shaping', label: 'Distortion & shaping' },
		{ id: 'pitch_oscillator', label: 'Pitch & oscillator' },
		{ id: 'sound_generation', label: 'Sound generation' },
		{ id: 'modulation_control', label: 'Modulation & control' },
		{ id: 'effects_dynamics', label: 'Effects & dynamics' },
		{ id: 'levels_utility', label: 'Levels & utility' }
	],
	ics: [
		{ id: 'ota_vca', label: 'OTAs & VCAs' },
		{ id: 'synth_chips', label: 'Filter & oscillator chips' },
		{ id: 'opamp_transistor', label: 'Op-amps & transistor arrays' },
		{ id: 'delay_noise', label: 'Delay & noise' },
		{ id: 'logic_digital', label: 'Logic & digital' },
		{ id: 'power_other', label: 'Power & other' }
	]
};

/** ICs are grouped by their `category`. */
export const IC_CATEGORY_GROUP: Record<string, string> = {
	ota: 'ota_vca',
	vca: 'ota_vca',
	filter: 'synth_chips',
	oscillator: 'synth_chips',
	opamp: 'opamp_transistor',
	comparator: 'opamp_transistor',
	transistor_array: 'opamp_transistor',
	delay: 'delay_noise',
	noise: 'delay_noise',
	logic: 'logic_digital',
	mcu: 'logic_digital',
	dac: 'logic_digital',
	timer: 'logic_digital',
	regulator: 'power_other',
	other: 'power_other'
};
