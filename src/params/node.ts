import type { ParamMatcher } from '@sveltejs/kit';
import { SLUG_TO_KEY } from '$lib/types';

/** Tag node types in URLs: /ic/ca3080, /subcircuit/ota_stage, /module/fx, /author/juergen-haible, … */
export const match = ((param: string) => param in SLUG_TO_KEY) satisfies ParamMatcher;
