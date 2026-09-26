// Shapes of the files written by scripts/build-data.js.

export type RegistryKey = 'manufacturers' | 'products' | 'circuitTypes' | 'subcircuits' | 'functions' | 'ics';

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';
export type Confidence = 'official' | 'academic' | 'community-verified' | 'community' | 'experimental';
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
	difficulty: Difficulty;
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
	difficulty: Difficulty;
	confidence: Confidence;
	added: string;
	terms: Record<RegistryKey, string[]>;
}

export const REGISTRY_KEYS: RegistryKey[] = ['manufacturers', 'products', 'circuitTypes', 'subcircuits', 'functions', 'ics'];

/** URL segment for each registry's pages (/subcircuit/ota_stage) and its display names. */
export const REGISTRY_META: Record<RegistryKey, { slug: string; label: string; plural: string }> = {
	manufacturers: { slug: 'manufacturer', label: 'Manufacturer', plural: 'Manufacturers' },
	products: { slug: 'product', label: 'Product', plural: 'Products' },
	circuitTypes: { slug: 'type', label: 'Circuit type', plural: 'Circuit types' },
	subcircuits: { slug: 'subcircuit', label: 'Subcircuit', plural: 'Subcircuits' },
	functions: { slug: 'function', label: 'Function', plural: 'Functions' },
	ics: { slug: 'ic', label: 'IC', plural: 'ICs' }
};

export const SLUG_TO_KEY = Object.fromEntries(
	Object.entries(REGISTRY_META).map(([key, meta]) => [meta.slug, key])
) as Record<string, RegistryKey>;

export const DIFFICULTIES: Difficulty[] = ['beginner', 'intermediate', 'advanced'];
export const CONFIDENCES: Confidence[] = ['official', 'academic', 'community-verified', 'community', 'experimental'];
