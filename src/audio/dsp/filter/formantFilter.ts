import type { FilterDefinition, FilterProcessor } from "./filterTypes";
import { FilterType, SVFilter } from "./svf";

/**
 * Vowel formant filter.
 * Resonance (cutoff-scaled) morphs between vowel presets.
 * Uses 3 bandpass SVFs tuned to F1, F2, F3 frequencies.
 */

// [F1, F2, F3, gain] for each vowel
const VOWELS: [number, number, number, number][] = [
  [800, 1200, 2500, 1.0],   // A
  [400, 2200, 2600, 0.9],   // E
  [300, 2300, 3000, 0.85],  // I
  [500, 1000, 2800, 0.9],   // O
  [300, 900, 2200, 0.85],   // U
];

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

class FormantFilter implements FilterProcessor {
  private bp1: SVFilter;
  private bp2: SVFilter;
  private bp3: SVFilter;
  private sampleRate: number;
  private cutoffScale = 1;

  constructor(sampleRate: number) {
    this.sampleRate = sampleRate;
    this.bp1 = new SVFilter(sampleRate);
    this.bp2 = new SVFilter(sampleRate);
    this.bp3 = new SVFilter(sampleRate);
  }

  setParams(cutoff: number, resonance: number, _sampleRate?: number): void {
    // Cutoff (20-20000) maps to a 0-4 vowel index
    const t = ((Math.log2(Math.max(cutoff, 20)) - Math.log2(20)) /
               (Math.log2(20000) - Math.log2(20))) * (VOWELS.length - 1);
    const i = Math.min(Math.floor(t), VOWELS.length - 2);
    const frac = t - i;

    const v0 = VOWELS[i];
    const v1 = VOWELS[i + 1];
    const f1 = lerp(v0[0], v1[0], frac);
    const f2 = lerp(v0[1], v1[1], frac);
    const f3 = lerp(v0[2], v1[2], frac);

    const reso = 0.5 + resonance * 0.3; // Keep resonance mild
    this.bp1.setParams(f1, reso, 1, FilterType.BANDPASS);
    this.bp2.setParams(f2, reso, 1, FilterType.BANDPASS);
    this.bp3.setParams(f3, reso * 0.7, 1, FilterType.BANDPASS);
    this.cutoffScale = lerp(v0[3], v1[3], frac);
  }

  process(input: number): number {
    const f1 = this.bp1.process(input);
    const f2 = this.bp2.process(input) * 0.7;
    const f3 = this.bp3.process(input) * 0.4;
    return (f1 + f2 + f3) * this.cutoffScale;
  }

  reset(): void {
    this.bp1.reset();
    this.bp2.reset();
    this.bp3.reset();
  }
}

export const FORMANT_FILTER_DEFINITIONS: FilterDefinition[] = [
  {
    id: "formant_vowel",
    name: "Vowel",
    category: "Formant",
    create: (sr) => new FormantFilter(sr),
  },
];
