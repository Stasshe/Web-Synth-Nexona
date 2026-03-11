import { lerp } from "../utils/interpolation";
import type { Wavetable } from "../wavetable/wavetableEngine";

export class Oscillator {
  private phase = 0;
  private frequency = 440;
  private sampleRate: number;
  private wavetable: Wavetable | null = null;

  constructor(sampleRate: number) {
    this.sampleRate = sampleRate;
  }

  setWavetable(wt: Wavetable): void {
    this.wavetable = wt;
  }

  setFrequency(freq: number): void {
    this.frequency = freq;
  }

  resetPhase(): void {
    this.phase = Math.random();
  }

  process(): number {
    if (!this.wavetable) return 0;

    const table = this.wavetable.frames[0];
    const size = this.wavetable.tableSize;

    const index = this.phase * size;
    const i = Math.floor(index);
    const frac = index - i;
    const sample = lerp(table[i], table[i + 1], frac);

    this.phase += this.frequency / this.sampleRate;
    if (this.phase >= 1.0) this.phase -= 1.0;

    return sample;
  }
}
