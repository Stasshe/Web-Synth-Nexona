import { lerp } from "../utils/interpolation";
import { midiToFreq } from "../utils/math";
import type { Wavetable } from "../wavetable/wavetablePresets";

export class SubOscillator {
  private phase = 0;
  private frequency = 220;
  private sampleRate: number;
  private wavetable: Wavetable | null = null;

  constructor(sampleRate: number) {
    this.sampleRate = sampleRate;
  }

  setWavetable(wt: Wavetable): void {
    this.wavetable = wt;
  }

  setNote(note: number, octaveOffset: number): void {
    this.frequency = midiToFreq(note + octaveOffset * 12);
  }

  resetPhase(): void {
    this.phase = 0;
  }

  process(): number {
    if (!this.wavetable) return 0;

    const table = this.wavetable.frames[0];
    const size = this.wavetable.tableSize;
    const index = this.phase * size;
    const i = Math.floor(index);
    const frac = index - i;
    const i1 = i < size ? i : size - 1;
    const i2 = i1 + 1 <= size ? i1 + 1 : 0;
    const sample = lerp(table[i1], table[i2], frac);

    this.phase += this.frequency / this.sampleRate;
    if (this.phase >= 1.0) this.phase -= 1.0;

    return sample;
  }
}
