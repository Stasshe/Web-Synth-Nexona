import { flushDenormal } from "../utils/denormal";

/**
 * Zero-delay feedback State Variable Filter (Chamberlin / Transposed Form II).
 * Simultaneously computes LP, BP, HP outputs — used as a building block by
 * Analog, Dirty, Digital and other models.
 */
export class SVFilter {
  private lp = 0;
  private bp = 0;
  private g = 0;
  private k = 0;

  /**
   * Update filter coefficients.
   * @param cutoff    Cutoff frequency Hz
   * @param resonance Resonance [0, 0.99)
   * @param sampleRate Sample rate Hz
   */
  setCoeffs(cutoff: number, resonance: number, sampleRate: number): void {
    const clampedCutoff = Math.min(cutoff, sampleRate * 0.49);
    this.g = Math.tan((Math.PI * clampedCutoff) / sampleRate);
    this.k = Math.max(0.01, 2 - 2 * Math.min(resonance, 0.99));
  }

  /**
   * Process one sample. Returns [lp, bp, hp] simultaneously.
   * This allows blend mixing without extra passes.
   */
  tick(input: number): [number, number, number] {
    const { g, k } = this;
    const hp = (input - this.lp - k * this.bp) / (1 + g * k + g * g);
    this.bp = flushDenormal(this.bp + g * hp);
    this.lp = flushDenormal(this.lp + g * this.bp);
    if (!Number.isFinite(this.bp)) this.bp = 0;
    if (!Number.isFinite(this.lp)) this.lp = 0;
    return [this.lp, this.bp, hp];
  }

  reset(): void {
    this.lp = 0;
    this.bp = 0;
  }
}

/**
 * Vital-style LP↔BP↔HP blend.
 * blend = -1 → pure LP
 * blend =  0 → pure BP
 * blend = +1 → pure HP
 */
export function blendLBH(lp: number, bp: number, hp: number, blend: number): number {
  const lpAmt = Math.max(0, -blend);
  const hpAmt = Math.max(0, blend);
  const bpAmt = 1 - lpAmt - hpAmt;
  return lpAmt * lp + bpAmt * bp + hpAmt * hp;
}

/**
 * Notch Blend style:  blend sweeps LP → Notch → HP.
 * blend = -1 → LP
 * blend =  0 → Notch (LP + HP)
 * blend = +1 → HP
 */
export function blendNotch(lp: number, hp: number, blend: number): number {
  const lpAmt = (1 - blend) * 0.5;
  const hpAmt = (1 + blend) * 0.5;
  return lpAmt * lp + hpAmt * hp;
}

/**
 * Compute the analytic SVF frequency response magnitude in dB.
 * Used by the filter graph display.
 * Returns magnitude in dB for LP/BP/HP blend at the given frequency.
 */
export function svfResponseDb(
  freqHz: number,
  cutoffHz: number,
  resonance: number,
  blend: number,
  sampleRate: number,
): number {
  const g = Math.tan((Math.PI * cutoffHz) / sampleRate);
  const k = Math.max(0.01, 2 - 2 * Math.min(resonance, 0.99));
  const w = Math.tan((Math.PI * freqHz) / sampleRate);

  // Denominator: D = (g²-w²) + j·k·g·w
  const Dr = g * g - w * w;
  const Di = k * g * w;
  const D2 = Dr * Dr + Di * Di;
  if (D2 < 1e-30) return -120;

  // H_LP = g² / D  →  multiply by conj(D)/|D|²
  const Hlp_r = (g * g * Dr) / D2;
  const Hlp_i = -(g * g * Di) / D2;

  // H_HP = -w² / D
  const Hhp_r = (-w * w * Dr) / D2;
  const Hhp_i = (w * w * Di) / D2;

  // H_BP = j·g·w / D  →  numerator j·g·w: real=0, imag=g·w
  //   (j·g·w)(Dr - j·Di) = g·w·Di + j·g·w·Dr
  const Hbp_r = (g * w * Di) / D2;
  const Hbp_i = (g * w * Dr) / D2;

  const lpAmt = Math.max(0, -blend);
  const hpAmt = Math.max(0, blend);
  const bpAmt = 1 - lpAmt - hpAmt;

  const Hr = lpAmt * Hlp_r + bpAmt * Hbp_r + hpAmt * Hhp_r;
  const Hi = lpAmt * Hlp_i + bpAmt * Hbp_i + hpAmt * Hhp_i;

  const mag = Math.sqrt(Hr * Hr + Hi * Hi);
  return 20 * Math.log10(Math.max(mag, 1e-6));
}

/**
 * 24-dB version: cascade two 12-dB SVF responses.
 */
export function svfResponseDb24(
  freqHz: number,
  cutoffHz: number,
  resonance: number,
  blend: number,
  sampleRate: number,
): number {
  const db12 = svfResponseDb(freqHz, cutoffHz, resonance, blend, sampleRate);
  return db12 * 2;
}

/**
 * Notch blend response in dB.
 */
export function svfNotchResponseDb(
  freqHz: number,
  cutoffHz: number,
  resonance: number,
  blend: number,
  sampleRate: number,
): number {
  const g = Math.tan((Math.PI * cutoffHz) / sampleRate);
  const k = Math.max(0.01, 2 - 2 * Math.min(resonance, 0.99));
  const w = Math.tan((Math.PI * freqHz) / sampleRate);

  const Dr = g * g - w * w;
  const Di = k * g * w;
  const D2 = Dr * Dr + Di * Di;
  if (D2 < 1e-30) return -120;

  const Hlp_r = (g * g * Dr) / D2;
  const Hlp_i = -(g * g * Di) / D2;
  const Hhp_r = (-w * w * Dr) / D2;
  const Hhp_i = (w * w * Di) / D2;

  // Notch = LP + HP, renormalized by 0.5 to keep unity gain far off resonance
  const lpAmt = (1 - blend) * 0.5;
  const hpAmt = (1 + blend) * 0.5;

  const Hr = lpAmt * Hlp_r + hpAmt * Hhp_r;
  const Hi = lpAmt * Hlp_i + hpAmt * Hhp_i;
  const mag = Math.sqrt(Hr * Hr + Hi * Hi);
  return 20 * Math.log10(Math.max(mag, 1e-6));
}
