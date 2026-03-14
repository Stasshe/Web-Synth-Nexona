import { ParamSmoother } from "../utils/smoothing";
import { DistortionType, applyDistortionPhase, applyRingMod } from "./warpTypes";

export class WarpProcessor {
  private type: DistortionType = DistortionType.NONE;
  private distortionPhase = 0.5;
  private smoother: ParamSmoother;

  constructor() {
    this.smoother = new ParamSmoother(0, 0.01);
  }

  setParams(type: DistortionType, amount: number, distortionPhase: number): void {
    this.type = type;
    this.smoother.setTarget(amount);
    this.distortionPhase = distortionPhase;
  }

  /** Tick smoother once per sample. Returns smoothed amount. */
  tickSmooth(): number {
    return this.smoother.tick();
  }

  /**
   * Apply phase distortion using pre-ticked amount.
   * fmSignal: mono output from another oscillator / noise (for FM types).
   */
  processPhase(phase: number, amount: number, fmSignal = 0): number {
    return applyDistortionPhase(phase, this.distortionPhase, this.type, amount, fmSignal);
  }

  /**
   * Apply ring modulation to a sample AFTER wavetable lookup.
   * No-op for non-RM types. Safe to always call.
   */
  processRM(sample: number, amount: number, fmSignal = 0): number {
    return applyRingMod(sample, this.type, amount, fmSignal);
  }

  getType(): DistortionType {
    return this.type;
  }

  reset(): void {
    this.smoother.snap();
  }
}
