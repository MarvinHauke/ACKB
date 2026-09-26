import type { ParamMatcher } from '@sveltejs/kit';
import { SLUG_TO_KEY } from '$lib/types';

export const match = ((param: string) => param in SLUG_TO_KEY) satisfies ParamMatcher;
