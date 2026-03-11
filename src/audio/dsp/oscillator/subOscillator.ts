import { midiToFreq } from "../utils/math";

export enum SubShape {
  SINE = 0,
  SQUARE = 1,
}

export class SubOscillator {
  private phase = 0;
  private frequency = 220;
  private sampleRate: number;

  constructor(sampleRate: number) {
    this.sampleRate = sampleRate;
  }

  setNote(note: number, octaveOffset: number): void {
    this.frequency = midiToFreq(note + octaveOffset * 12);
  }

  resetPhase(): void {
    this.phase = 0;
  }

  process(shape: SubShape): number {
    let sample: number;
    if (shape === SubShape.SINE) {
      sample = Math.sin(2 * Math.PI * this.phase);
    } else {
      sample = this.phase < 0.5 ? 1 : -1;
    }

    this.phase += this.frequency / this.sampleRate;
    if (this.phase >= 1.0) this.phase -= 1.0;

    return sample;
  }
}
