/**
 * Extensible filter architecture.
 * All filter implementations satisfy FilterProcessor.
 * FilterDefinition describes a filter in the registry.
 */

export interface FilterProcessor {
  /** Update cutoff (Hz) and resonance [0,1) before processing. */
  setParams(cutoff: number, resonance: number, sampleRate: number): void;
  /** Process one sample and return the filtered output. */
  process(input: number): number;
  /** Reset all internal state (call on noteOn). */
  reset(): void;
}

export interface FilterDefinition {
  /** Unique string ID, e.g. "analog_lp" */
  id: string;
  /** Display name shown in UI, e.g. "Lowpass" */
  name: string;
  /** Category label for grouping, e.g. "Analog" */
  category: string;
  /** Factory function — creates a new FilterProcessor instance. */
  create(sampleRate: number): FilterProcessor;
}
