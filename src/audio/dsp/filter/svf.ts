import { flushDenormal } from "../utils/denormal";

export const enum FilterType {
  LOWPASS,
  HIGHPASS,
  BANDPASS,
}

export class SVFilter {
  private lp = 0;
  private bp = 0;
  private g = 0;
  private k = 0;
  private drive = 1;
  private filterType: FilterType = FilterType.LOWPASS;
  private sampleRate: number;

  constructor(sampleRate: number) {
    this.sampleRate = sampleRate;
  }

  setParams(cutoff: number, resonance: number, drive: number, type: FilterType): void {
    const clampedCutoff = Math.min(cutoff, this.sampleRate * 0.49);
    this.g = Math.tan((Math.PI * clampedCutoff) / this.sampleRate);
    this.k = 2 - 2 * Math.min(resonance, 0.99);
    this.drive = drive;
    this.filterType = type;
  }

  process(input: number): number {
    const x = this.drive > 1 ? Math.tanh(this.drive * input) : input;

    const hp = (x - this.lp - this.k * this.bp) / (1 + this.g * this.k + this.g * this.g);
    this.bp = flushDenormal(this.bp + this.g * hp);
    this.lp = flushDenormal(this.lp + this.g * this.bp);

    switch (this.filterType) {
      case FilterType.LOWPASS:
        return this.lp;
      case FilterType.HIGHPASS:
        return hp;
      case FilterType.BANDPASS:
        return this.bp;
    }
  }

  reset(): void {
    this.lp = 0;
    this.bp = 0;
  }
}
