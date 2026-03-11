import { lerp } from "../utils/interpolation";
import { centsToRatio } from "../utils/math";
import type { Wavetable } from "../wavetable/wavetableEngine";
import { WarpProcessor } from "../warp/warpProcessor";
import { WarpType } from "../warp/warpTypes";

interface UnisonVoice {
  phase: number;
  detuneRatio: number;
  pan: number; // -1 to 1
}

export class UnisonEngine {
  private voices: UnisonVoice[] = [];
  private warp: WarpProcessor;
  private wavetable: Wavetable | null = null;
  private baseFrequency = 440;
  private sampleRate: number;
  private framePosition = 0;

  constructor(sampleRate: number) {
    this.sampleRate = sampleRate;
    this.warp = new WarpProcessor();
    this.setUnisonCount(1, 20, 0.5);
  }

  setWavetable(wt: Wavetable): void {
    this.wavetable = wt;
  }

  setFrequency(freq: number): void {
    this.baseFrequency = freq;
  }

  setFramePosition(pos: number): void {
    this.framePosition = pos;
  }

  setWarp(type1: WarpType, amount1: number, type2: WarpType, amount2: number): void {
    this.warp.setParams(type1, amount1, type2, amount2);
  }

  setUnisonCount(count: number, detuneCents: number, spread: number): void {
    const n = Math.max(1, Math.min(16, Math.round(count)));
    this.voices = [];
    for (let i = 0; i < n; i++) {
      let detuneOffset: number;
      let pan: number;
      if (n === 1) {
        detuneOffset = 0;
        pan = 0;
      } else {
        detuneOffset = (i / (n - 1) - 0.5) * 2 * detuneCents;
        pan = (i / (n - 1) * 2 - 1) * spread;
      }
      this.voices.push({
        phase: Math.random(),
        detuneRatio: centsToRatio(detuneOffset),
        pan,
      });
    }
  }

  resetPhases(): void {
    for (const v of this.voices) {
      v.phase = Math.random();
    }
    this.warp.reset();
  }

  /** Process one sample, returns [left, right] */
  process(fmSignal = 0): [number, number] {
    if (!this.wavetable) return [0, 0];

    let sumL = 0;
    let sumR = 0;
    const gain = 1 / Math.sqrt(this.voices.length);

    for (const voice of this.voices) {
      const freq = this.baseFrequency * voice.detuneRatio;
      const warpedPhase = this.warp.process(voice.phase, fmSignal);
      const sample = this.lookupWavetable(warpedPhase);

      // Pan law (equal power approximation)
      const panR = (voice.pan + 1) * 0.5;
      const panL = 1 - panR;
      sumL += sample * panL * gain;
      sumR += sample * panR * gain;

      // Phase accumulation
      voice.phase += freq / this.sampleRate;
      if (voice.phase >= 1.0) voice.phase -= 1.0;
    }

    return [sumL, sumR];
  }

  private lookupWavetable(phase: number): number {
    const wt = this.wavetable!;
    const size = wt.tableSize;

    if (wt.numFrames === 1) {
      const index = phase * size;
      const i = Math.floor(index);
      const frac = index - i;
      return lerp(wt.frames[0][i], wt.frames[0][i + 1], frac);
    }

    // Frame interpolation (morph)
    const frameIndex = this.framePosition * (wt.numFrames - 1);
    const f = Math.floor(frameIndex);
    const frameFrac = frameIndex - f;
    const f1 = Math.min(f, wt.numFrames - 1);
    const f2 = Math.min(f + 1, wt.numFrames - 1);

    const index = phase * size;
    const i = Math.floor(index);
    const frac = index - i;

    const s1 = lerp(wt.frames[f1][i], wt.frames[f1][i + 1], frac);
    const s2 = lerp(wt.frames[f2][i], wt.frames[f2][i + 1], frac);
    return lerp(s1, s2, frameFrac);
  }
}
