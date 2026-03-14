/**
 * Digital model — clean ZDF State Variable Filter with no saturation.
 * Allows very high Q and self-oscillation without harmonic distortion.
 * Styles: 0=12dB, 1=24dB, 2=Notch Blend
 */
import type { FilterModel, FilterProcessor } from "./filterTypes";
import { SVFilter, blendLBH, blendNotch } from "./svf";

class DigitalFilter implements FilterProcessor {
  private svf1: SVFilter;
  private svf2: SVFilter;
  private blend = -1;
  private style = 0;

  constructor(_sampleRate: number) {
    this.svf1 = new SVFilter();
    this.svf2 = new SVFilter();
  }

  setParams(
    cutoff: number,
    resonance: number,
    _drive: number,
    blend: number,
    style: number,
    sampleRate: number,
  ): void {
    this.blend = blend;
    this.style = style;
    // Digital allows resonance all the way to near-self-oscillation (0.995)
    const reso = Math.min(resonance, 0.995);
    this.svf1.setCoeffs(cutoff, reso, sampleRate);
    if (style === 1) this.svf2.setCoeffs(cutoff, 0, sampleRate);
  }

  process(input: number): number {
    // No saturation on digital model
    if (this.style === 2) {
      const [lp, , hp] = this.svf1.tick(input);
      return blendNotch(lp, hp, this.blend);
    }
    if (this.style === 1) {
      const [lp1, bp1, hp1] = this.svf1.tick(input);
      const mid = blendLBH(lp1, bp1, hp1, this.blend);
      const [lp2, bp2, hp2] = this.svf2.tick(mid);
      return blendLBH(lp2, bp2, hp2, this.blend);
    }
    const [lp, bp, hp] = this.svf1.tick(input);
    return blendLBH(lp, bp, hp, this.blend);
  }

  reset(): void {
    this.svf1.reset();
    this.svf2.reset();
  }
}

export const DIGITAL_MODEL: FilterModel = {
  id: "digital",
  name: "Digital",
  styleCount: 3,
  styleNames: ["12 dB", "24 dB", "Notch Blend"],
  create: (sr) => new DigitalFilter(sr),
};
