import { ParamSmoother } from "../utils/smoothing";
import { WarpType, applyWarp } from "./warpTypes";

export class WarpProcessor {
  private type1: WarpType = WarpType.NONE;
  private amount1: ParamSmoother;
  private type2: WarpType = WarpType.NONE;
  private amount2: ParamSmoother;

  constructor() {
    this.amount1 = new ParamSmoother(0, 0.001);
    this.amount2 = new ParamSmoother(0, 0.001);
  }

  setParams(type1: WarpType, amount1: number, type2: WarpType, amount2: number): void {
    this.type1 = type1;
    this.amount1.setTarget(amount1);
    this.type2 = type2;
    this.amount2.setTarget(amount2);
  }

  process(phase: number, fmSignal = 0): number {
    const a1 = this.amount1.tick();
    let p = applyWarp(phase, this.type1, a1, fmSignal);
    if (this.type2 !== WarpType.NONE) {
      const a2 = this.amount2.tick();
      p = applyWarp(p, this.type2, a2, fmSignal);
    }
    return p;
  }

  reset(): void {
    this.amount1.snap();
    this.amount2.snap();
  }
}
