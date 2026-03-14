/**
 * Dirty model — extended SVF with heavier tanh saturation (gritty/warm).
 * Identical topology to Analog but with stronger nonlinearity on the
 * resonance feedback path in addition to the pre-filter drive.
 * Styles: 0=12dB, 1=24dB, 2=Notch Blend
 */
import type { FilterModel, FilterProcessor } from "./filterTypes";
import { flushDenormal } from "../utils/denormal";
import { blendLBH, blendNotch } from "./svf";

/** SVF with tanh applied on the HP feedback — dirtier resonance character */
class DirtySVF {
  private lp = 0;
  private bp = 0;
  private g = 0;
  private k = 0;

  setCoeffs(cutoff: number, resonance: number, sampleRate: number): void {
    const clamped = Math.min(cutoff, sampleRate * 0.49);
    this.g = Math.tan((Math.PI * clamped) / sampleRate);
    this.k = Math.max(0.01, 2 - 2 * Math.min(resonance, 0.99));
  }

  tick(input: number): [number, number, number] {
    const { g, k } = this;
    // tanh on the summing node (feedback saturation — Vital "Dirty" character)
    const hp = Math.tanh(input - this.lp - k * this.bp) / (1 + g * k + g * g);
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

class DirtyFilter implements FilterProcessor {
  private svf1: DirtySVF;
  private svf2: DirtySVF;
  private drive = 1;
  private blend = -1;
  private style = 0;

  constructor(_sampleRate: number) {
    this.svf1 = new DirtySVF();
    this.svf2 = new DirtySVF();
  }

  setParams(
    cutoff: number,
    resonance: number,
    drive: number,
    blend: number,
    style: number,
    sampleRate: number,
  ): void {
    this.drive = drive;
    this.blend = blend;
    this.style = style;
    this.svf1.setCoeffs(cutoff, resonance, sampleRate);
    if (style === 1) this.svf2.setCoeffs(cutoff, 0, sampleRate);
  }

  process(input: number): number {
    // Stronger pre-drive on Dirty model (1.4× multiplier at same drive setting)
    const x = Math.tanh(input * this.drive * 1.4) / (this.drive * 1.4);

    if (this.style === 2) {
      const [lp, , hp] = this.svf1.tick(x);
      return blendNotch(lp, hp, this.blend);
    }
    if (this.style === 1) {
      const [lp1, bp1, hp1] = this.svf1.tick(x);
      const mid = blendLBH(lp1, bp1, hp1, this.blend);
      const [lp2, bp2, hp2] = this.svf2.tick(mid);
      return blendLBH(lp2, bp2, hp2, this.blend);
    }
    const [lp, bp, hp] = this.svf1.tick(x);
    return blendLBH(lp, bp, hp, this.blend);
  }

  reset(): void {
    this.svf1.reset();
    this.svf2.reset();
  }
}

export const DIRTY_MODEL: FilterModel = {
  id: "dirty",
  name: "Dirty",
  styleCount: 3,
  styleNames: ["12 dB", "24 dB", "Notch Blend"],
  create: (sr) => new DirtyFilter(sr),
};
