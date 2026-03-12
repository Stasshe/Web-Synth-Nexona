import { fft, ifft } from "../utils/fft";
import type { Wavetable } from "../wavetable/wavetableEngine";
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

  setSource(wt: Wavetable): void {
    this.sourceWavetable = wt;
    this.sourceMags = [];
    this.sourcePhases = [];
    this.sourceReal = [];
    this.sourceImag = [];
    this.cachedAmount = -1; // force recompute

    const size = wt.tableSize;

    for (let f = 0; f < wt.numFrames; f++) {
      const real = new Float32Array(size);
      const imag = new Float32Array(size);
      // Copy frame data (exclude wrap-around sample)
      for (let i = 0; i < size; i++) real[i] = wt.frames[f][i];
      fft(real, imag);

      const mags = new Float32Array(size / 2);
      const phases = new Float32Array(size / 2);
      for (let i = 0; i < size / 2; i++) {
        mags[i] = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]);
        phases[i] = Math.atan2(imag[i], real[i]);
      }
      this.sourceMags.push(mags);
      this.sourcePhases.push(phases);
      this.sourceReal.push(new Float32Array(real));
      this.sourceImag.push(new Float32Array(imag));
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
      let max = 0;
      for (let i = 0; i < size; i++) {
        table[i] = real[i];
        const a = Math.abs(real[i]);
        if (a > max) max = a;
      }
      if (max > 0) {
        for (let i = 0; i < size; i++) table[i] /= max;
      }
      table[size] = table[0];
      frames.push(table);
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
    _frameIdx: number,
  ): void {
    switch (type) {
      case SpectralMorphType.VOCODE:
        this.vocodeMorph(mags, halfSize, amount);
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
        this.phaseDisperseMorph(phases, halfSize, amount);
        break;
      case SpectralMorphType.SHEPARD_TONE:
        this.shepardMorph(mags, halfSize, amount);
        break;
      case SpectralMorphType.SKEW:
        this.skewMorph(mags, halfSize, amount);
        break;
      default:
        break;
    }
  }

  private vocodeMorph(mags: Float32Array, halfSize: number, amount: number): void {
    // Compute spectral envelope via smoothing, then re-apply with amount blend
    const envelope = new Float32Array(halfSize);
    const smooth = 8;
    for (let i = 0; i < halfSize; i++) {
      let sum = 0;
      let count = 0;
      for (let j = Math.max(0, i - smooth); j <= Math.min(halfSize - 1, i + smooth); j++) {
        sum += mags[j];
        count++;
      }
      envelope[i] = sum / count;
    }
    for (let i = 1; i < halfSize; i++) {
      const envNorm = envelope[i] > 1e-8 ? 1 / envelope[i] : 0;
      const flat = mags[i] * envNorm; // flattened
      mags[i] = mags[i] * (1 - amount) + flat * envelope[0] * amount;
    }
  }

  private formantScaleMorph(mags: Float32Array, halfSize: number, amount: number): void {
    const scale = 0.5 + amount * 1.5; // 0.5x to 2.0x
    const temp = new Float32Array(halfSize);
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
    temp[0] = mags[0];
    mags.set(temp);
  }

  private harmonicScaleMorph(mags: Float32Array, halfSize: number, amount: number): void {
    const scale = 0.5 + amount * 1.5;
    const temp = new Float32Array(halfSize);
    for (let i = 1; i < halfSize; i++) {
      const src = i * scale;
      const lo = Math.floor(src);
      const frac = src - lo;
      if (lo >= 0 && lo + 1 < halfSize) {
        temp[i] = mags[lo] * (1 - frac) + mags[lo + 1] * frac;
      } else if (lo >= 0 && lo < halfSize) {
        temp[i] = mags[lo] * (1 - frac);
      }
    }
    temp[0] = mags[0];
    mags.set(temp);
  }

  private inharmonicScaleMorph(mags: Float32Array, halfSize: number, amount: number): void {
    const temp = new Float32Array(halfSize);
    for (let i = 1; i < halfSize; i++) {
      // Nonlinear: higher harmonics stretch more
      const src = i * (1 + amount * i / halfSize);
      const lo = Math.floor(src);
      const frac = src - lo;
      if (lo >= 0 && lo + 1 < halfSize) {
        temp[i] = mags[lo] * (1 - frac) + mags[lo + 1] * frac;
      } else if (lo >= 0 && lo < halfSize) {
        temp[i] = mags[lo] * (1 - frac);
      }
    }
    temp[0] = mags[0];
    mags.set(temp);
  }

  private smearMorph(mags: Float32Array, halfSize: number, amount: number): void {
    const radius = Math.max(1, Math.floor(amount * halfSize / 4));
    const temp = new Float32Array(halfSize);
    for (let i = 0; i < halfSize; i++) {
      let sum = 0;
      let count = 0;
      for (let j = Math.max(0, i - radius); j <= Math.min(halfSize - 1, i + radius); j++) {
        sum += mags[j];
        count++;
      }
      temp[i] = sum / count;
    }
    mags.set(temp);
  }

  private randomAmplitudeMorph(mags: Float32Array, halfSize: number, amount: number): void {
    for (let i = 1; i < halfSize; i++) {
      const r = seededRandom(i * 7919); // deterministic per harmonic
      const factor = 1 - amount + amount * r * 2; // blend from 1.0 toward random
      mags[i] *= Math.max(0, factor);
    }
  }

  private lowPassMorph(mags: Float32Array, halfSize: number, amount: number): void {
    const cutoff = Math.floor((1 - amount) * (halfSize - 1)) + 1;
    const rolloff = Math.max(1, Math.floor(halfSize * 0.05));
    for (let i = 1; i < halfSize; i++) {
      if (i > cutoff + rolloff) {
        mags[i] = 0;
      } else if (i > cutoff) {
        mags[i] *= 1 - (i - cutoff) / rolloff;
      }
    }
  }

  private highPassMorph(mags: Float32Array, halfSize: number, amount: number): void {
    const cutoff = Math.floor(amount * (halfSize - 1));
    const rolloff = Math.max(1, Math.floor(halfSize * 0.05));
    for (let i = 1; i < halfSize; i++) {
      if (i < cutoff - rolloff) {
        mags[i] = 0;
      } else if (i < cutoff) {
        mags[i] *= (i - (cutoff - rolloff)) / rolloff;
      }
    }
  }

  private phaseDisperseMorph(phases: Float32Array, halfSize: number, amount: number): void {
    for (let i = 1; i < halfSize; i++) {
      const randPhase = seededRandom(i * 4253) * 2 * Math.PI - Math.PI;
      phases[i] = phases[i] * (1 - amount) + randPhase * amount;
    }
  }

  private shepardMorph(mags: Float32Array, halfSize: number, amount: number): void {
    // Bell curve in log-frequency space, centered at position controlled by amount
    const centerLog = 1 + amount * (Math.log2(halfSize) - 1);
    const width = 2; // octaves
    const temp = new Float32Array(halfSize);
    for (let i = 1; i < halfSize; i++) {
      const logI = Math.log2(i);
      // Sum octave-spaced copies
      let amp = 0;
      for (let oct = -3; oct <= 3; oct++) {
        const dist = logI - (centerLog + oct * (Math.log2(halfSize) - 1));
        amp += Math.exp(-(dist * dist) / (2 * width * width));
      }
      temp[i] = mags[i] * amp;
    }
    temp[0] = mags[0];
    mags.set(temp);
  }

  private skewMorph(mags: Float32Array, halfSize: number, amount: number): void {
    const skew = (amount - 0.5) * 4;
    for (let i = 1; i < halfSize; i++) {
      const factor = (i / halfSize) ** skew;
      mags[i] *= factor;
    }
  }
}
