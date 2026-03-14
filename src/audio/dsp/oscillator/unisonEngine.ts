import { lerp } from "../utils/interpolation";
import { centsToRatio } from "../utils/math";
import { WarpProcessor } from "../warp/warpProcessor";
import type { DistortionType } from "../warp/warpTypes";
import { isRMType } from "../warp/warpTypes";
import type { Wavetable } from "../wavetable/wavetablePresets";

// --- Unison Stack Types (matching Vital) ---

export enum UnisonStackType {
  UNISON = 0,
  CENTER_DROP_12 = 1,
  CENTER_DROP_24 = 2,
  OCTAVE = 3,
  TWO_OCTAVE = 4,
  POWER = 5,
  TWO_POWER = 6,
  MAJOR = 7,
  MINOR = 8,
  HARMONICS = 9,
  ODD_HARMONICS = 10,
}

export const UNISON_STACK_NAMES: Record<number, string> = {
  [UnisonStackType.UNISON]: "Unison",
  [UnisonStackType.CENTER_DROP_12]: "Ctr Drop 12",
  [UnisonStackType.CENTER_DROP_24]: "Ctr Drop 24",
  [UnisonStackType.OCTAVE]: "Octave",
  [UnisonStackType.TWO_OCTAVE]: "2x Octave",
  [UnisonStackType.POWER]: "Power",
  [UnisonStackType.TWO_POWER]: "2x Power",
  [UnisonStackType.MAJOR]: "Major",
  [UnisonStackType.MINOR]: "Minor",
  [UnisonStackType.HARMONICS]: "Harmonics",
  [UnisonStackType.ODD_HARMONICS]: "Odd Harm",
};

/** Frequency multiplier for stack type + voice index */
function getStackMultiplier(
  stackType: UnisonStackType,
  voiceIndex: number,
  totalVoices: number,
): number {
  const centerIdx = Math.floor((totalVoices - 1) / 2);

  switch (stackType) {
    case UnisonStackType.UNISON:
      return 1;

    case UnisonStackType.CENTER_DROP_12:
      return voiceIndex === centerIdx ? 0.5 : 1;

    case UnisonStackType.CENTER_DROP_24:
      return voiceIndex === centerIdx ? 0.25 : 1;

    case UnisonStackType.OCTAVE:
      return voiceIndex % 2 === 0 ? 1 : 2;

    case UnisonStackType.TWO_OCTAVE: {
      const mults = [1, 2, 4];
      return mults[voiceIndex % 3];
    }

    case UnisonStackType.POWER: {
      // root, 5th (~1.4983), octave
      const mults = [1, 1.4983070768766815, 2];
      return mults[voiceIndex % 3];
    }

    case UnisonStackType.TWO_POWER: {
      const mults = [1, 1.4983070768766815, 2, 2.9966141537533633, 4];
      return mults[voiceIndex % 5];
    }

    case UnisonStackType.MAJOR: {
      // root, maj3rd (~1.2599), 5th, octave
      const mults = [1, 1.2599210498948732, 1.4983070768766815, 2];
      return mults[voiceIndex % 4];
    }

    case UnisonStackType.MINOR: {
      // root, min3rd (~1.1892), 5th, octave
      const mults = [1, 1.1892071150027213, 1.4983070768766815, 2];
      return mults[voiceIndex % 4];
    }

    case UnisonStackType.HARMONICS:
      return voiceIndex + 1; // 1×, 2×, 3×…

    case UnisonStackType.ODD_HARMONICS:
      return 2 * voiceIndex + 1; // 1×, 3×, 5×…

    default:
      return 1;
  }
}

// amplitude blend constants (matching Vital)
const K_CENTER_LOW = 0.32;
const K_DETUNED_HIGH = 0.7;

// --- Params interface ---

export interface UnisonParams {
  count: number; // 1-16 voices
  detune: number; // 0-1 (normalized amount)
  blend: number; // 0-1 (center vs detuned amplitude mix)
  stereoSpread: number; // 0-1
  stackType: UnisonStackType;
  detunePower: number; // -5 to +5 (voice spacing curve)
  detuneRange: number; // 0-48 semitones (max span)
  frameSpread: number; // -128 to +128 (per-voice frame offset in frames)
}

interface UnisonVoice {
  phase: number;
  detuneRatio: number; // base freq multiplier from detune
  stackMult: number; // freq multiplier from stack type
  pan: number; // -1 to 1
  ampLeft: number; // pre-computed left amplitude
  ampRight: number; // pre-computed right amplitude
  frameOffset: number; // per-voice frame offset (0-1 normalized)
}

export class UnisonEngine {
  private voices: UnisonVoice[] = [];
  private distortion: WarpProcessor;
  private wavetable: Wavetable | null = null;
  private prevWavetable: Wavetable | null = null;
  private crossfadePos = 0;
  private crossfadeInc = 0;
  private static readonly CROSSFADE_SAMPLES = 256;

  private baseFrequency = 440;
  private sampleRate: number;
  private framePosition = 0;
  private cachedDistAmount = 0;

  private phaseOffset = 0;
  private randomPhaseAmount = 1;
  private lastOutputMono = 0; // For cross-osc FM feedback (1-sample delay)

  constructor(sampleRate: number) {
    this.sampleRate = sampleRate;
    this.distortion = new WarpProcessor();
    this._buildVoices(1, 0, 1, 0, UnisonStackType.UNISON, 1.5, 2, 0);
  }

  setWavetable(wt: Wavetable): void {
    if (this.wavetable && this.wavetable !== wt) {
      if (!this.prevWavetable || this.crossfadePos >= 1) {
        this.prevWavetable = this.wavetable;
        this.crossfadePos = 0;
        this.crossfadeInc = 1 / UnisonEngine.CROSSFADE_SAMPLES;
      }
    }
    this.wavetable = wt;
  }

  setFrequency(freq: number): void {
    this.baseFrequency = freq;
  }

  setFramePosition(pos: number): void {
    this.framePosition = pos;
  }

  /** Update distortion slot (single, Vital-style) */
  setDistortion(type: DistortionType, amount: number, distortionPhase: number): void {
    this.distortion.setParams(type, amount, distortionPhase);
  }

  /** Legacy method for compatibility during transition */
  setWarp(type1: DistortionType, amount1: number, _type2: DistortionType, _amount2: number): void {
    this.distortion.setParams(type1, amount1, 0.5);
  }

  setPhaseParams(offset: number, randomAmount: number): void {
    this.phaseOffset = offset;
    this.randomPhaseAmount = randomAmount;
  }

  /** Full Vital-compatible unison parameter update */
  setUnisonParams(p: UnisonParams): void {
    const n = Math.max(1, Math.min(16, Math.round(p.count)));
    this._buildVoices(
      n,
      p.detune,
      p.stereoSpread,
      p.blend,
      p.stackType,
      p.detunePower,
      p.detuneRange,
      p.frameSpread,
    );
  }

  /** Legacy simple unison setter (used by voice.ts during transition) */
  setUnisonCount(count: number, detuneCents: number, spread: number): void {
    // Map old API: detuneCents is 0-100, convert to 0-1 detune with 1-semitone range
    const detune = Math.min(1, detuneCents / 100);
    this._buildVoices(Math.round(count), detune, spread, 0.8, UnisonStackType.UNISON, 1.5, 1, 0);
  }

  /** Get last mono output sample (for cross-osc FM with 1-sample delay) */
  getLastOutput(): number {
    return this.lastOutputMono;
  }

  resetPhases(): void {
    for (const v of this.voices) {
      v.phase = (this.phaseOffset + Math.random() * this.randomPhaseAmount) % 1.0;
    }
    this.distortion.reset();
  }

  /** Process one sample. fmSignal = mono output from another osc (for FM/RM distortion). */
  process(fmSignal = 0): [number, number] {
    if (!this.wavetable) return [0, 0];

    const isCrossfading = this.prevWavetable && this.crossfadePos < 1;
    let sumL = 0;
    let sumR = 0;

    // Tick distortion smoother once per sample (not per voice)
    this.cachedDistAmount = this.distortion.tickSmooth();
    const isRM = isRMType(this.distortion.getType());

    for (const voice of this.voices) {
      const freq = this.baseFrequency * voice.detuneRatio * voice.stackMult;
      const warpedPhase = this.distortion.processPhase(
        voice.phase,
        this.cachedDistAmount,
        fmSignal,
      );

      // Frame position with per-voice spread
      const voiceFrame = Math.max(0, Math.min(1, this.framePosition + voice.frameOffset));

      let sample: number;
      if (isCrossfading) {
        const newSample = this._lookupWavetable(this.wavetable!, warpedPhase, voiceFrame);
        const oldSample = this._lookupWavetable(this.prevWavetable!, warpedPhase, voiceFrame);
        sample = lerp(oldSample, newSample, this.crossfadePos);
      } else {
        sample = this._lookupWavetable(this.wavetable, warpedPhase, voiceFrame);
      }

      // Apply ring modulation if applicable
      if (isRM) {
        sample = this.distortion.processRM(sample, this.cachedDistAmount, fmSignal);
      }

      sumL += sample * voice.ampLeft;
      sumR += sample * voice.ampRight;

      // Phase accumulation
      voice.phase += freq / this.sampleRate;
      if (voice.phase >= 1.0) voice.phase -= 1.0;
    }

    // Advance crossfade
    if (isCrossfading) {
      this.crossfadePos += this.crossfadeInc;
      if (this.crossfadePos >= 1) {
        this.crossfadePos = 1;
        this.prevWavetable = null;
      }
    }

    this.lastOutputMono = (sumL + sumR) * 0.5;
    return [sumL, sumR];
  }

  // ---

  private _buildVoices(
    n: number,
    detune: number, // 0-1 normalized
    stereoSpread: number,
    blend: number,
    stackType: UnisonStackType,
    detunePower: number,
    detuneRange: number, // semitones
    frameSpread: number, // frames (-128 to +128)
  ): void {
    const oldPhases = this.voices.map((v) => v.phase);
    this.voices = [];

    // Amplitude blend logic (Vital-style)
    const centerAmp = lerp(1.0, K_CENTER_LOW, blend);
    const detunedAmp = lerp(0, K_DETUNED_HIGH, blend);
    const centerIdx = Math.floor((n - 1) / 2);

    // Normalize total power
    let totalPower = 0;
    for (let i = 0; i < n; i++) {
      const a = i === centerIdx ? centerAmp : detunedAmp;
      totalPower += a * a;
    }
    const normFactor = totalPower > 0 ? 1 / Math.sqrt(totalPower) : 1;

    // Detune amount in cents total span
    const totalDetuneCents = detune * detuneRange * 100;

    for (let i = 0; i < n; i++) {
      // Normalized position -1 to +1
      const t = n > 1 ? (i / (n - 1)) * 2 - 1 : 0;

      // Apply detune power curve
      let shapedT: number;
      if (n <= 1 || totalDetuneCents === 0) {
        shapedT = 0;
      } else if (detunePower >= 1) {
        shapedT = Math.sign(t) * Math.pow(Math.abs(t), detunePower);
      } else if (detunePower > 0) {
        shapedT = Math.sign(t) * Math.pow(Math.abs(t), detunePower);
      } else {
        // Negative power — cluster at extremes, thin at center
        const absPow = Math.max(0.01, Math.abs(detunePower));
        shapedT = Math.abs(t) > 0 ? Math.sign(t) * (1 - Math.pow(1 - Math.abs(t), absPow)) : 0;
      }

      const detuneCentsOffset = shapedT * totalDetuneCents * 0.5; // half-spread per voice
      const detuneRatio = centsToRatio(detuneCentsOffset);

      // Stereo pan
      const pan = n > 1 ? t * stereoSpread : 0;
      const panR = (pan + 1) * 0.5;
      const panL = 1 - panR;

      // Amplitude (blend + normalization)
      const rawAmp = (i === centerIdx ? centerAmp : detunedAmp) * normFactor;

      // Stack multiplier
      const stackMult = getStackMultiplier(stackType, i, n);

      // Per-voice frame offset (normalized to 0-1 range)
      const frameOff = n > 1 ? (t * frameSpread) / 63.0 : 0;

      this.voices.push({
        phase: i < oldPhases.length ? oldPhases[i] : Math.random(),
        detuneRatio,
        stackMult,
        pan,
        ampLeft: rawAmp * panL * 2,
        ampRight: rawAmp * panR * 2,
        frameOffset: frameOff,
      });
    }
  }

  private _lookupWavetable(wt: Wavetable, phase: number, framePos: number): number {
    const size = wt.tableSize;
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

    const frameIndex = framePos * (wt.numFrames - 1);
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
