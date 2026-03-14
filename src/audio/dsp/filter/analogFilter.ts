/**
 * Analog model — Sallen-Key style SVF with tanh saturation.
 * Styles: 0=12dB, 1=24dB, 2=Notch Blend
 */
import type { FilterModel, FilterProcessor } from "./filterTypes";
import { SVFilter, blendLBH, blendNotch } from "./svf";

class AnalogFilter implements FilterProcessor {
  private svf1: SVFilter;
  private svf2: SVFilter;
  private drive = 1;
  private blend = -1;
  private style = 0;

  constructor(_sampleRate: number) {
    this.svf1 = new SVFilter();
    this.svf2 = new SVFilter();
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
    const x = this.drive > 1 ? Math.tanh(input * this.drive) / this.drive : input;

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

export const ANALOG_MODEL: FilterModel = {
  id: "analog",
  name: "Analog",
  styleCount: 3,
  styleNames: ["12 dB", "24 dB", "Notch Blend"],
  create: (sr) => new AnalogFilter(sr),
};
