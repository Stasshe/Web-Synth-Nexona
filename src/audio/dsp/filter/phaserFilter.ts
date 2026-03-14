/**
 * Phaser model — cascaded first-order allpass stages with resonant feedback.
 * Creates phaser notches in the frequency/phase response.
 * Cutoff → center frequency of allpass stages.
 * Resonance → feedback amount.
 * Blend → dry/wet.
 * Styles: 0=Positive phase, 1=Negative phase (notch vs peak)
 */
import type { FilterModel, FilterProcessor } from "./filterTypes";
import { flushDenormal } from "../utils/denormal";

const NUM_STAGES = 8;

class PhaserFilter implements FilterProcessor {
  // Each allpass stage: stores previous input (x[n-1])
  private prevX: Float64Array = new Float64Array(NUM_STAGES);
  // Each allpass stage: stores previous output (y[n-1])
  private prevY: Float64Array = new Float64Array(NUM_STAGES);
  private coeffs: Float64Array = new Float64Array(NUM_STAGES);
  private fbState = 0;
  private feedback = 0;
  private drive = 1;
  private blend = 0;
  private style = 0;

  constructor(_sampleRate: number) {}

  setParams(
    cutoff: number,
    resonance: number,
    drive: number,
    blend: number,
    style: number,
    sampleRate: number,
  ): void {
    this.feedback = resonance * 0.95;
    this.drive = drive;
    this.blend = blend;
    this.style = style;

    // Spread 8 allpass stages around cutoff (logarithmically)
    for (let i = 0; i < NUM_STAGES; i++) {
      const spread = Math.pow(2, (i - (NUM_STAGES - 1) * 0.5) * 0.25);
      const fc = Math.min(cutoff * spread, sampleRate * 0.45);
      const g = Math.tan((Math.PI * fc) / sampleRate);
      // First-order allpass coefficient: a = (g-1)/(g+1)
      this.coeffs[i] = (g - 1) / (g + 1);
    }
  }

  process(input: number): number {
    const x0 = this.drive > 1 ? Math.tanh(input * this.drive) / this.drive : input;

    // Resonant feedback from previous cycle
    const fed = x0 + this.fbState * this.feedback;

    // Cascade allpass stages
    // First-order allpass: y[n] = a*(x[n] - y[n-1]) + x[n-1]
    let sig = fed;
    for (let i = 0; i < NUM_STAGES; i++) {
      const a = this.coeffs[i];
      const y = flushDenormal(a * (sig - this.prevY[i]) + this.prevX[i]);
      this.prevX[i] = sig;
      this.prevY[i] = y;
      if (!Number.isFinite(this.prevY[i])) { this.prevX[i] = 0; this.prevY[i] = 0; }
      sig = y;
    }

    this.fbState = flushDenormal(sig);

    // Mix: positive adds allpass output (notch at phase cancellation points)
    //      negative subtracts (inverted — complementary peaks)
    const invertMult = this.style === 0 ? 1.0 : -1.0;
    const allpassMix = (x0 + invertMult * sig) * 0.5;

    const wet = (this.blend + 1) * 0.5;
    return x0 * (1 - wet) + allpassMix * wet;
  }

  reset(): void {
    this.prevX.fill(0);
    this.prevY.fill(0);
    this.fbState = 0;
  }
}

export const PHASER_MODEL: FilterModel = {
  id: "phaser",
  name: "Phaser",
  styleCount: 2,
  styleNames: ["Positive", "Negative"],
  create: (sr) => new PhaserFilter(sr),
};
