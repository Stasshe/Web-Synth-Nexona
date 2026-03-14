/**
 * Ladder model — Moog-style 4-pole transistor ladder filter.
 * Blend sweeps LP ↔ HP. Style 0 = 24dB, Style 1 = 12dB (2 stages only).
 */
import { flushDenormal } from "../utils/denormal";
import type { FilterModel, FilterProcessor } from "./filterTypes";

class LadderFilter implements FilterProcessor {
  private s: Float64Array = new Float64Array(4);
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

  /** Tick the ladder and return the LP output (s[3]). */
  private tickLP(input: number): number {
    const sr = this.sampleRate;
    const f = Math.min(this.cutoff / (sr * 0.5), 0.9999);
    const k = f * (1.873 - 0.4955 * f);
    const r = this.resonance * 3.98;
    const x0 =
      this.drive > 1
        ? Math.tanh(this.drive * input) / this.drive
        : input;

    const fb = r * this.s[3];
    let x = Math.tanh(x0 - fb);
    const stages = this.style === 1 ? 2 : 4;
    for (let i = 0; i < stages; i++) {
      const yn = this.s[i] + k * (Math.tanh(x) - Math.tanh(this.s[i]));
      this.s[i] = flushDenormal(yn);
      if (!Number.isFinite(this.s[i])) this.s[i] = 0;
      x = this.s[i];
    }
    return this.s[stages - 1];
  }

  process(input: number): number {
    const lp = this.tickLP(input);
    if (this.blend <= -0.99) return lp;
    // Derive HP by subtracting LP (shelving approach)
    const hp = input - lp;
    // blend: -1=LP, 0=mid, +1=HP
    const lpAmt = Math.max(0, -this.blend);
    const hpAmt = Math.max(0, this.blend);
    const midAmt = 1 - lpAmt - hpAmt;
    // mid = BP approximation: (HP + LP) * 0.5 with resonance boost
    const bp = (lp + hp) * 0.5;
    return lpAmt * lp + midAmt * bp + hpAmt * hp;
  }

  reset(): void {
    this.s.fill(0);
  }
}

export const LADDER_MODEL: FilterModel = {
  id: "ladder",
  name: "Ladder",
  styleCount: 2,
  styleNames: ["24 dB", "12 dB"],
  create: (sr) => new LadderFilter(sr),
};
