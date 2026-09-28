// Shapes of the files written by scripts/build-data.js.
// The data is a small knowledge graph: articles (one per link) and tag nodes, connected by the tags.

export type RegistryKey = 'manufacturers' | 'products' | 'modules' | 'subcircuits' | 'functions' | 'components' | 'authors';

export type ContentKind = 'build-guide' | 'explanation' | 'analysis' | 'schematic' | 'reference';
export type Confidence = 'official' | 'academic' | 'community';
export type LinkStatus = 'ok' | 'redirect' | 'broken' | 'timeout' | 'blocked' | 'unchecked';

/** A reference from one tag node to another (key = registry). `n`: shared articles. */
export interface NodeRef {
	key: RegistryKey;
	id: string;
	n?: number;
}

export interface Term {
	id: string;
	label: string;
	aliases?: string[];
	description?: string;
	parent?: string;
	/** Articles tagged with it (a parent also counts its children's). */
	count: number;
	// Registry-specific extras (products, components, subcircuits, authors).
	manufacturer?: string;
	year?: number;
	category?: string;
	datasheetUrl?: string;
	status?: string;
	alternatives?: string[];
	pdfOcrKind?: string;
	url?: string;
	/** Sidebar group (subcircuits, functions). */
	group?: string;
	/** Edges to other tag nodes: same kind of thing, and often used together. */
	related: { same: NodeRef[]; together: NodeRef[] };
}

export interface TermRef {
	id: string;
	label: string;
}

export interface Related {
	id: string;
	title: string;
	score: number;
	reasons: string[];
}

export interface Article {
	id: string;
	title: string;
	url: string;
	/** Source type: website, video, repo, … */
	type: string;
	year: number | null;
	lang: string;
	license: string | null;
	summary: string;
	/** Summary still describes a former group of links (to be rewritten). */
	summaryFromGroup: boolean;
	kinds: ContentKind[];
	confidence: Confidence;
	added: string;
	reviewed: string | null;
	status: LinkStatus;
	archiveUrl: string | null;
	terms: Record<RegistryKey, TermRef[]>;
	subcircuitParents: string[];
	related: Related[];
}

export type Taxonomy = Record<RegistryKey, Term[]>;

export interface Catalog {
	generatedAt: string;
	articles: Article[];
	taxonomy: Taxonomy;
}

/** Compact article for the result lists and client-side filtering. */
export interface ArticleSummary {
	id: string;
	title: string;
	url: string;
	type: string;
	summary: string;
	kinds: ContentKind[];
	confidence: Confidence;
	added: string;
	year: number | null;
	status: LinkStatus;
	/** https:// (false for http:// sites, which get a warning badge). */
	secure: boolean;
	terms: Record<RegistryKey, string[]>;
}

export const REGISTRY_KEYS: RegistryKey[] = [
	'manufacturers',
	'products',
	'modules',
	'subcircuits',
	'functions',
	'components',
	'authors'
];

/** URL name for each registry (/component/ca3080, ?component=ca3080, data/component/ca3080.json) and its display names. */
export const REGISTRY_META: Record<RegistryKey, { slug: string; label: string; plural: string }> = {
	manufacturers: { slug: 'manufacturer', label: 'Manufacturer', plural: 'Manufacturers' },
	products: { slug: 'product', label: 'Product', plural: 'Products' },
	modules: { slug: 'module', label: 'Module', plural: 'Modules' },
	subcircuits: { slug: 'subcircuit', label: 'Subcircuit', plural: 'Subcircuits' },
	functions: { slug: 'function', label: 'Function', plural: 'Functions' },
	components: { slug: 'component', label: 'Component', plural: 'Components & ICs' },
	authors: { slug: 'author', label: 'Author', plural: 'Authors' }
};

export const SLUG_TO_KEY = Object.fromEntries(
	Object.entries(REGISTRY_META).map(([key, meta]) => [meta.slug, key])
) as Record<string, RegistryKey>;

/**
 * A tag's path below its type: its id, or `parent/id` for subtypes (fx/delay,
 * opamp-stage/voltage-follower). Used in page URLs (/module/fx/delay), filter URLs
 * (?module=fx/delay) and lookup files (data/module/fx/delay.json).
 */
export const termPath = (id: string, parent?: string) => (parent ? `${parent}/${id}` : id);

/** Parents of subtypes, keyed "registry:id" (e.g. "modules:delay" → "fx"). */
export type ParentMap = Record<string, string>;

export const CONTENT_KINDS: ContentKind[] = ['build-guide', 'explanation', 'analysis', 'schematic', 'reference'];

export const KIND_LABEL: Record<ContentKind, string> = {
	'build-guide': 'Build Guide',
	explanation: 'Explanation',
	analysis: 'Analysis',
	schematic: 'Schematic',
	reference: 'Reference'
};
export const CONFIDENCES: Confidence[] = ['official', 'academic', 'community'];

/** Sidebar groups, in display order. Subcircuits and functions carry `group` in the taxonomy. */
export const TERM_GROUPS: Partial<Record<RegistryKey, { id: string; label: string }[]>> = {
	subcircuits: [
		{ id: 'opamp-stages', label: 'Op-Amp Stages' },
		{ id: 'transistor-stages', label: 'Transistor & OTA Stages' },
		{ id: 'filter-topologies', label: 'Filter Topologies' },
		{ id: 'passive-networks', label: 'Passive Networks' },
		{ id: 'shaping-dynamics', label: 'Shaping & Dynamics' },
		{ id: 'sources', label: 'Oscillator & Signal Sources' },
		{ id: 'time-switching', label: 'Time, Memory & Switching' },
		{ id: 'digital-interface', label: 'Digital & Interface' },
		{ id: 'power', label: 'Power' }
	],
	functions: [
		{ id: 'filter-response', label: 'Filter Response' },
		{ id: 'distortion-shaping', label: 'Distortion & Shaping' },
		{ id: 'pitch-oscillator', label: 'Pitch & Oscillator' },
		{ id: 'sound-generation', label: 'Sound Generation' },
		{ id: 'modulation-control', label: 'Modulation & Control' },
		{ id: 'effects-dynamics', label: 'Effects & Dynamics' },
		{ id: 'levels-utility', label: 'Levels & Utility' }
	],
	components: [
		{ id: 'ota-vca', label: 'OTAs & VCAs' },
		{ id: 'synth-chips', label: 'Filter & Oscillator Chips' },
		{ id: 'opamp-transistor', label: 'Op-Amps & Transistor Arrays' },
		{ id: 'delay-noise', label: 'Delay & Noise' },
		{ id: 'logic-digital', label: 'Logic & Digital' },
		{ id: 'optical', label: 'Optical' },
		{ id: 'magnetic', label: 'Magnetic' },
		{ id: 'power-other', label: 'Power & Other' }
	]
};

/** Components & ICs are grouped by their `category`. */
export const COMPONENT_CATEGORY_GROUP: Record<string, string> = {
	ota: 'ota-vca',
	vca: 'ota-vca',
	filter: 'synth-chips',
	oscillator: 'synth-chips',
	opamp: 'opamp-transistor',
	comparator: 'opamp-transistor',
	'transistor-array': 'opamp-transistor',
	delay: 'delay-noise',
	noise: 'delay-noise',
	logic: 'logic-digital',
	mcu: 'logic-digital',
	dac: 'logic-digital',
	timer: 'logic-digital',
	optical: 'optical',
	magnetic: 'magnetic',
	regulator: 'power-other',
	other: 'power-other'
};
