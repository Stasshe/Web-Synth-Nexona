import { fft, ifft } from "../utils/fft";
import type { Wavetable } from "../wavetable/wavetablePresets";
import { SpectralMorphType } from "./spectralMorphTypes";

/** Deterministic pseudo-random based on index (mulberry32) */
function seededRandom(seed: number): number {
  let t = (seed + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export class SpectralMorphProcessor {
  private sourceWavetable: Wavetable | null = null;
  private sourceMags: Float32Array[] = [];
  private sourcePhases: Float32Array[] = [];
  private sourceReal: Float32Array[] = [];
  private sourceImag: Float32Array[] = [];
  private cachedType = SpectralMorphType.NONE;
  private cachedAmount = -1;
  private morphedWavetable: Wavetable | null = null;
  /** Pre-computed random amplitude buffers for RANDOM_AMPLITUDES morph */
  private randomBuffers: Float32Array[] = [];
  private static readonly NUM_RANDOM_STAGES = 8;

  setSource(wt: Wavetable): void {
    this.sourceWavetable = wt;
    this.sourceMags = [];
    this.sourcePhases = [];
    this.sourceReal = [];
    this.sourceImag = [];
    this.cachedAmount = -1; // force recompute

    const size = wt.tableSize;
    const halfSize = size / 2;

    for (let f = 0; f < wt.numFrames; f++) {
      const real = new Float32Array(size);
      const imag = new Float32Array(size);
      for (let i = 0; i < size; i++) real[i] = wt.frames[f][i];
      fft(real, imag);

      const mags = new Float32Array(halfSize);
      const phases = new Float32Array(halfSize);
      for (let i = 0; i < halfSize; i++) {
        mags[i] = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]);
        phases[i] = Math.atan2(imag[i], real[i]);
      }
      this.sourceMags.push(mags);
      this.sourcePhases.push(phases);
      this.sourceReal.push(new Float32Array(real));
      this.sourceImag.push(new Float32Array(imag));
    }

    // Pre-compute random buffers for RANDOM_AMPLITUDES
    this.randomBuffers = [];
    for (let stage = 0; stage < SpectralMorphProcessor.NUM_RANDOM_STAGES; stage++) {
      const buf = new Float32Array(halfSize);
      for (let i = 0; i < halfSize; i++) {
        buf[i] = seededRandom(i * 7919 + stage * 15731);
      }
      this.randomBuffers.push(buf);
    }
  }

  getMorphed(type: SpectralMorphType, amount: number): Wavetable | null {
    if (!this.sourceWavetable) return null;
    if (type === SpectralMorphType.NONE) return this.sourceWavetable;

    // Quantize amount to avoid excessive recomputation
    const quantized = Math.round(amount * 127) / 127;
    if (type === this.cachedType && quantized === this.cachedAmount && this.morphedWavetable) {
      return this.morphedWavetable;
    }

    this.cachedType = type;
    this.cachedAmount = quantized;

    const wt = this.sourceWavetable;
    const size = wt.tableSize;
    const halfSize = size / 2;
    const frames: Float32Array[] = [];

    for (let f = 0; f < wt.numFrames; f++) {
      const newMags = new Float32Array(this.sourceMags[f]);
      const newPhases = new Float32Array(this.sourcePhases[f]);

      this.applyMorph(type, quantized, newMags, newPhases, halfSize, f);

      // Reconstruct real/imag from magnitude/phase
      const real = new Float32Array(size);
      const imag = new Float32Array(size);
      for (let i = 0; i < halfSize; i++) {
        real[i] = newMags[i] * Math.cos(newPhases[i]);
        imag[i] = newMags[i] * Math.sin(newPhases[i]);
      }
      // Mirror for real-valued signal
      for (let i = 1; i < halfSize; i++) {
        real[size - i] = real[i];
        imag[size - i] = -imag[i];
      }

      ifft(real, imag);

      const table = new Float32Array(size + 1);
      for (let i = 0; i < size; i++) {
        table[i] = real[i];
      }
      table[size] = table[0];
      frames.push(table);
    }

    // Global normalization: find max across ALL frames, normalize all by the same value
    let globalMax = 0;
    for (let f = 0; f < frames.length; f++) {
      const frame = frames[f];
      for (let i = 0; i < size; i++) {
        const a = Math.abs(frame[i]);
        if (a > globalMax) globalMax = a;
      }
    }
    if (globalMax > 1e-8) {
      const scale = 1.0 / globalMax;
      for (let f = 0; f < frames.length; f++) {
        const frame = frames[f];
        for (let i = 0; i < size; i++) {
          frame[i] *= scale;
        }
        frame[size] = frame[0]; // update wrap-around
      }
    }

    this.morphedWavetable = { frames, tableSize: size, numFrames: wt.numFrames };
    return this.morphedWavetable;
  }

  private applyMorph(
    type: SpectralMorphType,
    amount: number,
    mags: Float32Array,
    phases: Float32Array,
    halfSize: number,
    frameIdx: number,
  ): void {
    switch (type) {
      case SpectralMorphType.VOCODE:
        this.vocodeMorph(mags, phases, halfSize, amount);
        break;
      case SpectralMorphType.FORMANT_SCALE:
        this.formantScaleMorph(mags, halfSize, amount);
        break;
      case SpectralMorphType.HARMONIC_SCALE:
        this.harmonicScaleMorph(mags, halfSize, amount);
        break;
      case SpectralMorphType.INHARMONIC_SCALE:
        this.inharmonicScaleMorph(mags, halfSize, amount);
        break;
      case SpectralMorphType.SMEAR:
        this.smearMorph(mags, halfSize, amount);
        break;
      case SpectralMorphType.RANDOM_AMPLITUDES:
        this.randomAmplitudeMorph(mags, halfSize, amount);
        break;
      case SpectralMorphType.LOW_PASS:
        this.lowPassMorph(mags, halfSize, amount);
        break;
      case SpectralMorphType.HIGH_PASS:
        this.highPassMorph(mags, halfSize, amount);
        break;
      case SpectralMorphType.PHASE_DISPERSE:
        this.phaseDisperseMorph(mags, phases, halfSize, amount);
        break;
      case SpectralMorphType.SHEPARD_TONE:
        this.shepardMorph(mags, halfSize, amount);
        break;
      case SpectralMorphType.SKEW:
        this.skewMorph(mags, phases, halfSize, amount, frameIdx);
        break;
      default:
        break;
    }
  }

  /**
   * Vocode: Even/odd parity-preserving harmonic shift (Vital-style).
   * Shifts harmonic positions while preserving even/odd parity.
   * Amount 0 = no shift (passthrough), amount 1 = maximum shift.
   */
  private vocodeMorph(
    mags: Float32Array,
    phases: Float32Array,
    halfSize: number,
    amount: number,
  ): void {
    // Shift factor: 0.5x to 2.0x
    const shift = 0.5 + amount * 1.5;
    const tempMags = new Float32Array(halfSize);
    const tempPhases = new Float32Array(halfSize);
    tempMags[0] = mags[0];
    tempPhases[0] = phases[0];

    for (let i = 1; i < halfSize; i++) {
      // Source position with shift
      const srcPos = i / shift;
      // Snap to matching parity (even/odd)
      const parity = i & 1; // 0 = even, 1 = odd
      let lo = Math.floor(srcPos);
      // Snap lo to same parity
      if ((lo & 1) !== parity) {
        lo = lo > 0 ? lo - 1 : lo + 1;
      }
      let hi = lo + 2; // next same-parity neighbor

      if (lo < 1) lo = parity === 1 ? 1 : 2;
      if (hi >= halfSize) hi = lo;

      const range = hi - lo;
      const frac = range > 0 ? Math.max(0, Math.min(1, (srcPos - lo) / range)) : 0;

      if (lo < halfSize && hi < halfSize) {
        tempMags[i] = mags[lo] * (1 - frac) + mags[hi] * frac;
        tempPhases[i] = phases[lo] * (1 - frac) + phases[hi] * frac;
      } else if (lo < halfSize) {
        tempMags[i] = mags[lo];
        tempPhases[i] = phases[lo];
      }
    }
    mags.set(tempMags);
    phases.set(tempPhases);
  }

  /**
   * Formant Scale: Shift spectral envelope up/down with exponential scaling.
   * Amount 0 = formants shifted down (0.25x), 0.5 = no change, 1 = up (4x).
   */
  private formantScaleMorph(mags: Float32Array, halfSize: number, amount: number): void {
    const scale = 2 ** ((amount - 0.5) * 2); // 0.25x to 4.0x
    const temp = new Float32Array(halfSize);
    temp[0] = mags[0];
    for (let i = 1; i < halfSize; i++) {
      const src = i / scale;
      const lo = Math.floor(src);
      const frac = src - lo;
      if (lo >= 0 && lo + 1 < halfSize) {
        temp[i] = mags[lo] * (1 - frac) + mags[lo + 1] * frac;
      } else if (lo >= 0 && lo < halfSize) {
        temp[i] = mags[lo] * (1 - frac);
      }
    }
    mags.set(temp);
  }

  /**
   * Harmonic Scale: Vital-style accumulate-into-destination.
   * Each source harmonic distributes its energy to the destination position.
   * Amount 0 = compressed (0.5x), 1 = stretched (2.0x).
   */
  private harmonicScaleMorph(mags: Float32Array, halfSize: number, amount: number): void {
    const shift = 0.5 + amount * 1.5; // 0.5x to 2.0x
    const temp = new Float32Array(halfSize);
    temp[0] = mags[0];

    for (let i = 1; i < halfSize; i++) {
      // Vital's mapping: destination = max(1, (i-1)*shift + 1)
      const dst = Math.max(1, (i - 1) * shift + 1);
      const lo = Math.floor(dst);
      const hi = lo + 1;
      const frac = dst - lo;

      // Distribute source energy to adjacent destination bins
      if (lo < halfSize) {
        temp[lo] += mags[i] * (1 - frac);
      }
      if (hi < halfSize) {
        temp[hi] += mags[i] * frac;
      }
    }
    mags.set(temp);
  }

  /**
   * Inharmonic Scale: Exponential frequency-dependent stretch (Vital-style).
   * Higher harmonics get exponentially more stretching.
   * Amount 0 = no stretch, 1 = maximum inharmonicity.
   */
  private inharmonicScaleMorph(mags: Float32Array, halfSize: number, amount: number): void {
    const mult = 1 + amount * 3; // multiplier range 1x to 4x
    const temp = new Float32Array(halfSize);
    temp[0] = mags[0];

    for (let i = 1; i < halfSize; i++) {
      // Vital-style: shift = mult^(log2(i) / log2(halfSize-1))
      const logRatio = Math.log2(i) / Math.log2(halfSize - 1);
      const shift = mult ** logRatio;
      const dst = Math.max(1, i * shift);
      const lo = Math.floor(dst);
      const hi = lo + 1;
      const frac = dst - lo;

      if (lo < halfSize) {
        temp[lo] += mags[i] * (1 - frac);
      }
      if (hi < halfSize) {
        temp[hi] += mags[i] * frac;
      }
    }
    mags.set(temp);
  }

  /**
   * Smear: Vital-style recursive single-pass smoothing with energy compensation.
   * Each harmonic blends with the already-smoothed previous harmonic.
   */
  private smearMorph(mags: Float32Array, halfSize: number, amount: number): void {
    const smearFactor = amount * 0.98; // prevent full feedback
    const temp = new Float32Array(halfSize);
    temp[0] = mags[0];

    // Forward pass: blend each bin with already-smoothed previous
    for (let i = 1; i < halfSize; i++) {
      const energyComp = (i + 0.25) / i; // Vital's energy compensation
      const smoothed = temp[i - 1] * energyComp;
      temp[i] = mags[i] * (1 - smearFactor) + smoothed * smearFactor;
    }

    // Backward pass for symmetry (prevents bias toward high frequencies)
    for (let i = halfSize - 2; i >= 1; i--) {
      const energyComp = (i + 0.25) / i;
      const smoothed = temp[i + 1] * energyComp;
      temp[i] = temp[i] * (1 - smearFactor * 0.5) + smoothed * smearFactor * 0.5;
    }

    mags.set(temp);
  }

  /**
   * Random Amplitudes: Multi-stage random with interpolation (Vital-style).
   * Uses pre-computed random buffers, interpolates between stages based on amount.
   */
  private randomAmplitudeMorph(mags: Float32Array, halfSize: number, amount: number): void {
    const stages = SpectralMorphProcessor.NUM_RANDOM_STAGES;
    const scaledAmount = amount * (stages - 1);
    const stageIdx = Math.floor(scaledAmount);
    const frac = scaledAmount - stageIdx;
    const stageA = Math.min(stageIdx, stages - 1);
    const stageB = Math.min(stageIdx + 1, stages - 1);
    const bufA = this.randomBuffers[stageA];
    const bufB = this.randomBuffers[stageB];

    for (let i = 1; i < halfSize; i++) {
      // Interpolate between two random buffer stages
      const randomVal = bufA[i] * (1 - frac) + bufB[i] * frac;
      // Scale: at amount=0 factor is ~1.0, at amount=1 factor varies 0-2
      const sparsity = 1 + amount * 1.5; // increase sparseness with amount
      const factor = randomVal ** sparsity;
      mags[i] *= factor;
    }
  }

  /**
   * Low Pass: Exponential cutoff mapping (Vital-style).
   * Smoother roll-off with exponential frequency mapping.
   */
  private lowPassMorph(mags: Float32Array, halfSize: number, amount: number): void {
    // Vital-style exponential cutoff: maps amount more musically
    const cutoffT = 1 - amount; // invert so amount=1 means most filtering
    const cutoff = 2 ** (cutoffT * Math.log2(halfSize - 1)) + 1;
    const cutoffInt = Math.floor(cutoff);
    const cutoffFrac = cutoff - cutoffInt;

    for (let i = 1; i < halfSize; i++) {
      if (i > cutoffInt + 1) {
        mags[i] = 0;
      } else if (i === cutoffInt + 1) {
        mags[i] *= 1 - cutoffFrac; // sub-bin fractional crossfade
      } else if (i === cutoffInt) {
        mags[i] *= cutoffFrac + (1 - cutoffFrac); // smooth transition at boundary
      }
    }
  }

  /**
   * High Pass: Mirror of Low Pass with complementary fractional multiplier (Vital-style).
   */
  private highPassMorph(mags: Float32Array, halfSize: number, amount: number): void {
    const cutoff = 2 ** (amount * Math.log2(halfSize - 1)) + 1;
    const cutoffInt = Math.floor(cutoff);
    const cutoffFrac = cutoff - cutoffInt;

    for (let i = 1; i < halfSize; i++) {
      if (i < cutoffInt) {
        mags[i] = 0;
      } else if (i === cutoffInt) {
        mags[i] *= cutoffFrac; // complementary fractional crossfade
      }
    }
  }

  /**
   * Phase Disperse: Quadratic phase dispersion centered on harmonic 24 (Vital-style).
   * Creates chirp-like effects as harmonics further from center get progressively
   * more phase rotation.
   */
  private phaseDisperseMorph(
    mags: Float32Array,
    phases: Float32Array,
    halfSize: number,
    amount: number,
  ): void {
    const CENTER = 24;
    const phaseShift = amount * Math.PI * 4; // max ~4π of dispersion
    const offset = amount * Math.PI * 2;

    for (let i = 1; i < halfSize; i++) {
      // Quadratic dispersion: harmonics further from center get more rotation
      const dist = i - CENTER;
      const phaseOffset = dist * dist * phaseShift / (halfSize * halfSize) * 100 + offset;

      // Apply via complex multiplication (rotation)
      const cos = Math.cos(phaseOffset);
      const sin = Math.sin(phaseOffset);
      const re = mags[i] * Math.cos(phases[i]);
      const im = mags[i] * Math.sin(phases[i]);
      const newRe = re * cos - im * sin;
      const newIm = re * sin + im * cos;

      mags[i] = Math.sqrt(newRe * newRe + newIm * newIm);
      phases[i] = Math.atan2(newIm, newRe);
    }
  }

  /**
   * Shepard Tone: Blend between harmonic's amplitude and octave-down copy (Vital-style).
   * Creates the Shepard tone illusion of endlessly ascending/descending pitch.
   */
  private shepardMorph(mags: Float32Array, halfSize: number, amount: number): void {
    const temp = new Float32Array(halfSize);
    temp[0] = mags[0];

    for (let i = 1; i < halfSize; i++) {
      // The octave-down harmonic index (half frequency)
      const octDown = Math.floor(i / 2);
      // Blend between own amplitude and octave-down position's amplitude
      if (octDown >= 1) {
        temp[i] = mags[i] * (1 - amount) + mags[octDown] * amount;
      } else {
        temp[i] = mags[i] * (1 - amount);
      }
    }
    mags.set(temp);
  }

  /**
   * Skew: Cross-frame harmonic remapping based on log-frequency (Vital-style).
   * Higher harmonics pull timbral data from different wavetable frames.
   * Falls back to passthrough with 1 frame.
   */
  private skewMorph(
    mags: Float32Array,
    phases: Float32Array,
    halfSize: number,
    amount: number,
    frameIdx: number,
  ): void {
    if (!this.sourceWavetable || this.sourceWavetable.numFrames <= 1) return;

    const numFrames = this.sourceWavetable.numFrames;
    const skewAmount = (amount - 0.5) * 2; // -1 to +1

    for (let i = 1; i < halfSize; i++) {
      // Log-frequency based frame offset
      const logPos = Math.log2(i) / Math.log2(halfSize - 1); // 0 to 1
      const frameOffset = logPos * skewAmount * (numFrames - 1);
      let targetFrame = frameIdx + frameOffset;

      // Triangle-wave wrapping to stay in bounds
      targetFrame = ((targetFrame % (numFrames * 2)) + numFrames * 2) % (numFrames * 2);
      if (targetFrame >= numFrames) {
        targetFrame = numFrames * 2 - 1 - targetFrame;
      }
      targetFrame = Math.max(0, Math.min(numFrames - 1, targetFrame));

      const lo = Math.floor(targetFrame);
      const hi = Math.min(lo + 1, numFrames - 1);
      const frac = targetFrame - lo;

      // Interpolate magnitudes and phases from the target frames
      const srcMagsLo = this.sourceMags[lo];
      const srcMagsHi = this.sourceMags[hi];
      const srcPhasesLo = this.sourcePhases[lo];
      const srcPhasesHi = this.sourcePhases[hi];

      if (i < srcMagsLo.length && i < srcMagsHi.length) {
        mags[i] = srcMagsLo[i] * (1 - frac) + srcMagsHi[i] * frac;
        phases[i] = srcPhasesLo[i] * (1 - frac) + srcPhasesHi[i] * frac;
      }
    }
  }
}
