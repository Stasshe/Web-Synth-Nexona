/**
 * Diode model — TB-303-inspired diode ladder filter.
 * Characteristic mid-range boost through a high-pass feedback path.
 * Styles: 0=Low Shelf (mild HP effect), 1=Low Cut (strong HP feedback)
 * Blend: LP ↔ HP response (the HP element of diode character)
 */
import type { FilterModel, FilterProcessor } from "./filterTypes";
import { flushDenormal } from "../utils/denormal";

class DiodeFilter implements FilterProcessor {
  private s: Float64Array = new Float64Array(4);
  private hpState = 0;
  private cutoff = 1000;
  private resonance = 0;
  private drive = 1;
  private blend = -1;
  private style = 0;
  private sampleRate: number;

  constructor(sampleRate: number) {
    this.sampleRate = sampleRate;
  }

  setParams(
    cutoff: number,
    resonance: number,
    drive: number,
    blend: number,
    style: number,
    _sampleRate: number,
  ): void {
    this.cutoff = cutoff;
    this.resonance = resonance;
    this.drive = drive;
    this.blend = blend;
    this.style = style;
  }

  process(input: number): number {
    const sr = this.sampleRate;
    // LP coefficient for main stages
    const f = Math.min(this.cutoff / (sr * 0.5), 0.95);
    const k = f * (1.873 - 0.4955 * f);

    // HP pre-filter at ~80Hz (diode asymmetry)
    const hpBase = style_hpFreq(this.style);
    const hpF = Math.tan((Math.PI * hpBase) / sr) / (1 + Math.tan((Math.PI * hpBase) / sr));
    const hp = input - this.hpState;
    this.hpState = flushDenormal(this.hpState + hpF * hp);

    // High-pass amount depends on style
    const hpAmt = this.style === 0 ? 0.3 + this.blend * 0.3 : 0.6 + this.blend * 0.4;
    const x0 = input + hp * hpAmt;

    const driveX = this.drive > 1 ? Math.tanh(this.drive * x0) / this.drive : x0;
    const r = this.resonance * 4.5; // TB-303 can self-oscillate
    const fb = r * this.s[3];
    let x = Math.tanh(driveX - fb);

    for (let i = 0; i < 4; i++) {
      const yn = this.s[i] + k * (Math.tanh(x) - Math.tanh(this.s[i]));
      this.s[i] = flushDenormal(yn);
      if (!Number.isFinite(this.s[i])) this.s[i] = 0;
      x = this.s[i];
    }
    return this.s[3];
  }

  reset(): void {
    this.s.fill(0);
    this.hpState = 0;
  }
}

function style_hpFreq(style: number): number {
  return style === 0 ? 80 : 200;
}

export const DIODE_MODEL: FilterModel = {
  id: "diode",
  name: "Diode",
  styleCount: 2,
  styleNames: ["Low Shelf", "Low Cut"],
  create: (sr) => new DiodeFilter(sr),
};
