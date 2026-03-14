/**
 * Vital-style filter architecture.
 * 8 filter models each supporting blend (LP↔BP↔HP morph) and style sub-modes.
 */

export interface FilterProcessor {
  /**
   * Update filter parameters before processing.
   * @param cutoff   Cutoff frequency in Hz (20–20000)
   * @param resonance Resonance [0, 0.99)
   * @param drive    Pre-filter drive/saturation amount [1, 10]
   * @param blend    LP↔BP↔HP morph: -1=LP, 0=BP, +1=HP
   * @param style    Sub-mode index (meaning depends on model)
   * @param sampleRate Audio sample rate in Hz
   */
  setParams(
    cutoff: number,
    resonance: number,
    drive: number,
    blend: number,
    style: number,
    sampleRate: number,
  ): void;
  /** Process one audio sample. */
  process(input: number): number;
  /** Reset all internal state (call on noteOn). */
  reset(): void;
}

export interface FilterModel {
  /** Unique string ID */
  id: string;
  /** Display name */
  name: string;
  /** Number of style sub-modes */
  styleCount: number;
  /** Display names for each style */
  styleNames: string[];
  /** Factory — creates a new FilterProcessor instance */
  create(sampleRate: number): FilterProcessor;
}

/** Vital-compatible filter model indices */
export const enum FilterModelIndex {
  Analog = 0,
  Dirty = 1,
  Ladder = 2,
  Digital = 3,
  Diode = 4,
  Formant = 5,
  Comb = 6,
  Phaser = 7,
}
