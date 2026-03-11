import { flushDenormal } from "../utils/denormal";
import type { FilterDefinition, FilterProcessor } from "./filterTypes";

/**
 * Simplified Moog-style transistor ladder filter (4-pole, 24dB/oct LP).
 * Based on the Huovilainen non-linear model, simplified for performance.
 */
class LadderLPFilter implements FilterProcessor {
  private s: Float64Array = new Float64Array(4); // stage state
  private cutoff = 0;
  private resonance = 0;
  private sampleRate: number;

  constructor(sampleRate: number) {
    this.sampleRate = sampleRate;
  }

  setParams(cutoff: number, resonance: number, _sampleRate?: number): void {
    this.cutoff = cutoff;
    this.resonance = resonance;
  }

  process(input: number): number {
    const sr = this.sampleRate;
    const f = Math.min(this.cutoff / (sr * 0.5), 0.9999);
    const k = f * (1.873 - 0.4955 * f); // warped cutoff coefficient
    const r = this.resonance * 3.98; // resonance [0, ~4) for self-oscillation

    // Feedback
    const fb = r * this.s[3];
    let x = Math.tanh(input - fb);

    // Four one-pole stages
    for (let i = 0; i < 4; i++) {
      const yn = this.s[i] + k * (Math.tanh(x) - Math.tanh(this.s[i]));
      this.s[i] = flushDenormal(yn);
      x = this.s[i];
    }

    return this.s[3];
  }

  reset(): void {
    this.s.fill(0);
  }
}

/** Ladder highpass: subtract LP from input (shelving trick). */
class LadderHPFilter implements FilterProcessor {
  private lp: LadderLPFilter;

  constructor(sampleRate: number) {
    this.lp = new LadderLPFilter(sampleRate);
  }

  setParams(cutoff: number, resonance: number, sampleRate: number): void {
    this.lp.setParams(cutoff, resonance, sampleRate);
  }

  process(input: number): number {
    return input - this.lp.process(input);
  }

  reset(): void {
    this.lp.reset();
  }
}

export const LADDER_FILTER_DEFINITIONS: FilterDefinition[] = [
  {
    id: "ladder_lp",
    name: "Ladder LP",
    category: "Ladder",
    create: (sr) => new LadderLPFilter(sr),
  },
  {
    id: "ladder_hp",
    name: "Ladder HP",
    category: "Ladder",
    create: (sr) => new LadderHPFilter(sr),
  },
];
