import { lerp } from "../utils/interpolation";
import { centsToRatio } from "../utils/math";
import { WarpProcessor } from "../warp/warpProcessor";
import type { WarpType } from "../warp/warpTypes";
import type { Wavetable } from "../wavetable/wavetablePresets";

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
  private cachedWarpAmounts: [number, number] = [0, 0];
  private phaseOffset = 0;
  private randomPhaseAmount = 1;

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

  setPhaseParams(offset: number, randomAmount: number): void {
    this.phaseOffset = offset;
    this.randomPhaseAmount = randomAmount;
  }

  setUnisonCount(count: number, detuneCents: number, spread: number): void {
    const n = Math.max(1, Math.min(16, Math.round(count)));

    // Only rebuild voices array when count changes
    if (n !== this.voices.length) {
      const oldPhases = this.voices.map((v) => v.phase);
      this.voices = [];
      for (let i = 0; i < n; i++) {
        this.voices.push({
          phase: i < oldPhases.length ? oldPhases[i] : Math.random(),
          detuneRatio: 1,
          pan: 0,
        });
      }
    }

    // Update detune + pan in-place (no phase reset)
    for (let i = 0; i < n; i++) {
      const voice = this.voices[i];
      if (n === 1) {
        voice.detuneRatio = 1;
        voice.pan = 0;
      } else {
        const detuneOffset = (i / (n - 1) - 0.5) * 2 * detuneCents;
        voice.detuneRatio = centsToRatio(detuneOffset);
        voice.pan = ((i / (n - 1)) * 2 - 1) * spread;
      }
    }
  }

  resetPhases(): void {
    for (const v of this.voices) {
      v.phase = (this.phaseOffset + Math.random() * this.randomPhaseAmount) % 1.0;
    }
    this.warp.reset();
  }

  /** Process one sample, returns [left, right] */
  process(fmSignal = 0): [number, number] {
    if (!this.wavetable) return [0, 0];

    let sumL = 0;
    let sumR = 0;
    const gain = 1 / Math.sqrt(this.voices.length);

    // Tick warp smoothers once per sample (not per unison voice)
    this.cachedWarpAmounts = this.warp.tickSmooth();

    for (const voice of this.voices) {
      const freq = this.baseFrequency * voice.detuneRatio;
      const warpedPhase = this.warp.processWithCached(
        voice.phase,
        this.cachedWarpAmounts,
        fmSignal,
      );
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

    // Clamp phase to [0, 1) to prevent out-of-bounds access
    let p = phase;
    if (p < 0) p = 0;
    else if (p >= 1) p -= Math.floor(p);

    if (wt.numFrames === 1) {
      const index = p * size;
      const i = Math.floor(index);
      const frac = index - i;
      const i1 = i < size ? i : size - 1;
      const i2 = i1 + 1 <= size ? i1 + 1 : 0;
      return lerp(wt.frames[0][i1], wt.frames[0][i2], frac);
    }

    // Frame interpolation (morph)
    const frameIndex = this.framePosition * (wt.numFrames - 1);
    const f = Math.floor(frameIndex);
    const frameFrac = frameIndex - f;
    const f1 = Math.min(f, wt.numFrames - 1);
    const f2 = Math.min(f + 1, wt.numFrames - 1);

    const index = p * size;
    const i = Math.floor(index);
    const frac = index - i;
    const i1 = i < size ? i : size - 1;
    const i2 = i1 + 1 <= size ? i1 + 1 : 0;

    const s1 = lerp(wt.frames[f1][i1], wt.frames[f1][i2], frac);
    const s2 = lerp(wt.frames[f2][i1], wt.frames[f2][i2], frac);
    return lerp(s1, s2, frameFrac);
  }
}
