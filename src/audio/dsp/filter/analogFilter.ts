import { flushDenormal } from "../utils/denormal";
import type { FilterDefinition, FilterProcessor } from "./filterTypes";
import { FilterType, SVFilter } from "./svf";

/** Thin wrapper: exposes SVFilter as a FilterProcessor. */
class AnalogFilter implements FilterProcessor {
  private svf: SVFilter;
  private type: FilterType;

  constructor(sampleRate: number, type: FilterType) {
    this.svf = new SVFilter(sampleRate);
    this.type = type;
  }

  setParams(cutoff: number, resonance: number, _sampleRate?: number): void {
    this.svf.setParams(cutoff, resonance, 1, this.type);
  }

  process(input: number): number {
    return this.svf.process(input);
  }

  reset(): void {
    this.svf.reset();
  }
}

/** Two 12dB SVFs in series → 24dB/oct rolloff, shared resonance on first stage. */
class Analog24Filter implements FilterProcessor {
  private svf1: SVFilter;
  private svf2: SVFilter;
  private type: FilterType;

  constructor(sampleRate: number, type: FilterType) {
    this.svf1 = new SVFilter(sampleRate);
    this.svf2 = new SVFilter(sampleRate);
    this.type = type;
  }

  setParams(cutoff: number, resonance: number, _sampleRate?: number): void {
    this.svf1.setParams(cutoff, resonance, 1, this.type);
    this.svf2.setParams(cutoff, 0, 1, this.type);
  }

  process(input: number): number {
    return this.svf2.process(this.svf1.process(input));
  }

  reset(): void {
    this.svf1.reset();
    this.svf2.reset();
  }
}

/** SVF peak / peaking EQ mode: bp * k (band emphasis). */
class AnalogPeakFilter implements FilterProcessor {
  private lp = 0;
  private bp = 0;
  private g = 0;
  private k = 0;
  private sampleRate: number;

  constructor(sampleRate: number) {
    this.sampleRate = sampleRate;
  }

  setParams(cutoff: number, resonance: number, _sampleRate?: number): void {
    const clampedCutoff = Math.min(cutoff, this.sampleRate * 0.49);
    this.g = Math.tan((Math.PI * clampedCutoff) / this.sampleRate);
    this.k = 2 - 2 * Math.min(resonance, 0.99);
  }

  process(input: number): number {
    const hp = (input - this.lp - this.k * this.bp) / (1 + this.g * this.k + this.g * this.g);
    this.bp = flushDenormal(this.bp + this.g * hp);
    this.lp = flushDenormal(this.lp + this.g * this.bp);
    if (!Number.isFinite(this.bp)) this.bp = 0;
    if (!Number.isFinite(this.lp)) this.lp = 0;
    // Peak = input + resonance-scaled bp
    return input + (2 - this.k) * this.bp;
  }

  reset(): void {
    this.lp = 0;
    this.bp = 0;
  }
}

export const ANALOG_FILTER_DEFINITIONS: FilterDefinition[] = [
  {
    id: "analog_lp12",
    name: "Lowpass 12",
    category: "Analog",
    create: (sr) => new AnalogFilter(sr, FilterType.LOWPASS),
  },
  {
    id: "analog_hp12",
    name: "Highpass 12",
    category: "Analog",
    create: (sr) => new AnalogFilter(sr, FilterType.HIGHPASS),
  },
  {
    id: "analog_bp12",
    name: "Bandpass",
    category: "Analog",
    create: (sr) => new AnalogFilter(sr, FilterType.BANDPASS),
  },
  {
    id: "analog_notch",
    name: "Notch",
    category: "Analog",
    create: (sr) => new AnalogFilter(sr, FilterType.NOTCH),
  },
  {
    id: "analog_lp24",
    name: "Lowpass 24",
    category: "Analog",
    create: (sr) => new Analog24Filter(sr, FilterType.LOWPASS),
  },
  {
    id: "analog_hp24",
    name: "Highpass 24",
    category: "Analog",
    create: (sr) => new Analog24Filter(sr, FilterType.HIGHPASS),
  },
  {
    id: "analog_peak",
    name: "Peak",
    category: "Analog",
    create: (sr) => new AnalogPeakFilter(sr),
  },
];
