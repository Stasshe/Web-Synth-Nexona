import type { FilterDefinition, FilterProcessor } from "./filterTypes";

/** Feedback comb filter — creates resonant peaks at multiples of the delay frequency. */
class FeedbackCombFilter implements FilterProcessor {
  private buffer: Float32Array;
  private writePos = 0;
  private delaySamples = 0;
  private feedback = 0;

  constructor(private sampleRate: number) {
    this.buffer = new Float32Array(Math.ceil(sampleRate * 0.1) + 1); // max 100ms
  }

  setParams(cutoff: number, resonance: number, _sampleRate?: number): void {
    // Map cutoff to delay length: delay = 1/cutoff (fundamental at cutoff Hz)
    const delaySec = 1 / Math.max(cutoff, 20);
    this.delaySamples = Math.min(delaySec * this.sampleRate, this.buffer.length - 1);
    this.feedback = resonance * 0.98;
  }

  process(input: number): number {
    const len = this.buffer.length;
    // Linear interpolation for fractional delay
    const delayInt = Math.floor(this.delaySamples);
    const frac = this.delaySamples - delayInt;
    const readA = (this.writePos - delayInt + len) % len;
    const readB = (readA - 1 + len) % len;
    const delayed = this.buffer[readA] * (1 - frac) + this.buffer[readB] * frac;

    const out = input + delayed * this.feedback;
    this.buffer[this.writePos] = out;
    this.writePos = (this.writePos + 1) % len;
    return out;
  }

  reset(): void {
    this.buffer.fill(0);
    this.writePos = 0;
  }
}

/** Feedforward comb + feedback comb (bandpass-like resonant comb). */
class ResonantCombFilter implements FilterProcessor {
  private buffer: Float32Array;
  private writePos = 0;
  private delaySamples = 0;
  private feedback = 0;

  constructor(private sampleRate: number) {
    this.buffer = new Float32Array(Math.ceil(sampleRate * 0.1) + 1);
  }

  setParams(cutoff: number, resonance: number, _sampleRate?: number): void {
    const delaySec = 1 / Math.max(cutoff, 20);
    this.delaySamples = Math.min(delaySec * this.sampleRate, this.buffer.length - 1);
    this.feedback = resonance * 0.9;
  }

  process(input: number): number {
    const len = this.buffer.length;
    const delayInt = Math.floor(this.delaySamples);
    const frac = this.delaySamples - delayInt;
    const readA = (this.writePos - delayInt + len) % len;
    const readB = (readA - 1 + len) % len;
    const delayed = this.buffer[readA] * (1 - frac) + this.buffer[readB] * frac;

    const out = input * 0.5 + delayed * this.feedback;
    this.buffer[this.writePos] = input + delayed * this.feedback;
    this.writePos = (this.writePos + 1) % len;
    return out;
  }

  reset(): void {
    this.buffer.fill(0);
    this.writePos = 0;
  }
}

export const COMB_FILTER_DEFINITIONS: FilterDefinition[] = [
  {
    id: "comb_feedback",
    name: "Comb FB",
    category: "Comb",
    create: (sr) => new FeedbackCombFilter(sr),
  },
  {
    id: "comb_resonant",
    name: "Comb Res",
    category: "Comb",
    create: (sr) => new ResonantCombFilter(sr),
  },
];
