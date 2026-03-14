/**
 * Formant model — vowel formant filter using parallel SVF bandpass sections.
 * Blend morphs between vowel positions (X axis).
 * Styles: 0=AOIE vowel sequence, 1=AIUO vowel sequence
 */
import type { FilterModel, FilterProcessor } from "./filterTypes";
import { SVFilter } from "./svf";

// Vital-style vowel data: [F1, F2, F3, F4, gain]
//   F1-F4 = first four formant frequencies in Hz
//   gain  = relative output level
const VOWELS_AOIE: [number, number, number, number, number][] = [
  [800, 1150, 2900, 3400, 1.0],  // A
  [500, 1000, 2800, 3300, 0.9],  // O
  [300,  900, 2200, 3100, 0.85], // U (between O and I)
  [280, 2250, 2900, 3400, 0.85], // I
  [400, 2200, 2600, 3300, 0.9],  // E
];

const VOWELS_AIUO: [number, number, number, number, number][] = [
  [800, 1150, 2900, 3400, 1.0],  // A
  [280, 2250, 2900, 3400, 0.85], // I
  [300,  900, 2200, 3100, 0.85], // U
  [500, 1000, 2800, 3300, 0.9],  // O
];

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

class FormantFilter implements FilterProcessor {
  private bands: SVFilter[];
  private sampleRate: number;
  private gain = 1;
  private style = 0;

  constructor(sampleRate: number) {
    this.sampleRate = sampleRate;
    this.bands = Array.from({ length: 4 }, () => new SVFilter());
  }

  setParams(
    cutoff: number,
    resonance: number,
    _drive: number,
    blend: number,
    style: number,
    sampleRate: number,
  ): void {
    this.sampleRate = sampleRate;
    this.style = style;

    const vowels = style === 1 ? VOWELS_AIUO : VOWELS_AOIE;
    const n = vowels.length;

    // Cutoff (20–20000 Hz log) → vowel X position [0, n-1]
    // blend (-1..+1) provides fine-grain morph within the vowel space
    const tBase =
      ((Math.log2(Math.max(cutoff, 20)) - Math.log2(20)) / (Math.log2(20000) - Math.log2(20))) *
      (n - 1);
    // blend shifts the position slightly (±0.5 vowel positions)
    const t = Math.max(0, Math.min(n - 1, tBase + blend * 0.5));

    const i = Math.min(Math.floor(t), n - 2);
    const frac = t - i;
    const v0 = vowels[i];
    const v1 = vowels[i + 1];

    this.gain = lerp(v0[4], v1[4], frac);

    // Q from resonance: mild formant peaks (0.55 base + user control)
    const q = 0.55 + resonance * 0.35;

    for (let b = 0; b < 4; b++) {
      const freq = lerp(v0[b], v1[b], frac);
      // SVF bandpass: use setCoeffs with resonance mapped to Q
      // Q = 1/k, k = 2-2*r → r = 1 - 1/(2Q)
      const r = 1 - 1 / (2 * Math.max(q, 0.5));
      this.bands[b].setCoeffs(freq, r, sampleRate);
    }
  }

  process(input: number): number {
    let out = 0;
    const weights = [1.0, 0.8, 0.55, 0.35];
    for (let b = 0; b < 4; b++) {
      const [, bp] = this.bands[b].tick(input);
      out += bp * weights[b];
    }
    return out * this.gain;
  }

  reset(): void {
    for (const b of this.bands) b.reset();
  }
}

export const FORMANT_MODEL: FilterModel = {
  id: "formant",
  name: "Formant",
  styleCount: 2,
  styleNames: ["AOIE", "AIUO"],
  create: (sr) => new FormantFilter(sr),
};
