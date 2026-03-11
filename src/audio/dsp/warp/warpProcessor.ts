import { ParamSmoother } from "../utils/smoothing";
import { WarpType, applyWarp } from "./warpTypes";

export class WarpProcessor {
  private type1: WarpType = WarpType.NONE;
  private amount1: ParamSmoother;
  private type2: WarpType = WarpType.NONE;
  private amount2: ParamSmoother;

  constructor() {
    this.amount1 = new ParamSmoother(0, 0.01);
    this.amount2 = new ParamSmoother(0, 0.01);
  }

  setParams(type1: WarpType, amount1: number, type2: WarpType, amount2: number): void {
    this.type1 = type1;
    this.amount1.setTarget(amount1);
    this.type2 = type2;
    this.amount2.setTarget(amount2);
  }

  /** Tick smoothers once per sample. Returns [amount1, amount2]. */
  tickSmooth(): [number, number] {
    return [this.amount1.tick(), this.amount2.tick()];
  }

  /** Apply warp using pre-ticked amounts (safe to call per unison voice). */
  processWithCached(phase: number, amounts: [number, number], fmSignal = 0): number {
    let p = applyWarp(phase, this.type1, amounts[0], fmSignal);
    if (this.type2 !== WarpType.NONE) {
      p = applyWarp(p, this.type2, amounts[1], fmSignal);
    }
    return p;
  }

  process(phase: number, fmSignal = 0): number {
    const amounts = this.tickSmooth();
    return this.processWithCached(phase, amounts, fmSignal);
  }

  reset(): void {
    this.amount1.snap();
    this.amount2.snap();
  }
}
