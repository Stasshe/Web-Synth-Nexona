import { ANALOG_FILTER_DEFINITIONS } from "./analogFilter";
import { COMB_FILTER_DEFINITIONS } from "./combFilter";
import { FORMANT_FILTER_DEFINITIONS } from "./formantFilter";
import { LADDER_FILTER_DEFINITIONS } from "./ladderFilter";
import type { FilterDefinition, FilterProcessor } from "./filterTypes";

/**
 * All registered filter types in display order.
 * The numeric index into this array is stored in the SAB as FilterType.
 */
export const FILTER_REGISTRY: FilterDefinition[] = [
  ...ANALOG_FILTER_DEFINITIONS,  // 0-6
  ...LADDER_FILTER_DEFINITIONS,  // 7-8
  ...COMB_FILTER_DEFINITIONS,    // 9-10
  ...FORMANT_FILTER_DEFINITIONS, // 11
];

export function getFilterByIndex(index: number): FilterDefinition {
  const def = FILTER_REGISTRY[index];
  if (!def) return FILTER_REGISTRY[0];
  return def;
}

export function getFilterCategories(): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const def of FILTER_REGISTRY) {
    if (!seen.has(def.category)) {
      seen.add(def.category);
      result.push(def.category);
    }
  }
  return result;
}

export function createFilter(index: number, sampleRate: number): FilterProcessor {
  return getFilterByIndex(index).create(sampleRate);
}

export const FILTER_COUNT = FILTER_REGISTRY.length;
