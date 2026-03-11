import { describe, expect, it } from "vitest";
import { ModSource, ModTarget, ModulationMatrix } from "../modMatrix";

describe("ModulationMatrix", () => {
  it("returns 0 with no routes", () => {
    const mm = new ModulationMatrix();
    mm.setSourceValue(ModSource.LFO1, 0.5);
    expect(mm.getModulation(ModTarget.FILTER_CUTOFF)).toBe(0);
  });

  it("single route applies source * amount", () => {
    const mm = new ModulationMatrix();
    mm.setRoutes([{ source: ModSource.LFO1, target: ModTarget.FILTER_CUTOFF, amount: 0.5 }]);
    mm.setSourceValue(ModSource.LFO1, 0.8);
    expect(mm.getModulation(ModTarget.FILTER_CUTOFF)).toBeCloseTo(0.4, 5);
  });

  it("multiple routes to same target sum", () => {
    const mm = new ModulationMatrix();
    mm.setRoutes([
      { source: ModSource.LFO1, target: ModTarget.FILTER_CUTOFF, amount: 0.5 },
      { source: ModSource.AMP_ENV, target: ModTarget.FILTER_CUTOFF, amount: 0.3 },
    ]);
    mm.setSourceValue(ModSource.LFO1, 1.0);
    mm.setSourceValue(ModSource.AMP_ENV, 1.0);
    expect(mm.getModulation(ModTarget.FILTER_CUTOFF)).toBeCloseTo(0.8, 5);
  });

  it("apply adds modulation to base value", () => {
    const mm = new ModulationMatrix();
    mm.setRoutes([{ source: ModSource.LFO1, target: ModTarget.FILTER_CUTOFF, amount: 1.0 }]);
    mm.setSourceValue(ModSource.LFO1, 0.5);
    const result = mm.apply(ModTarget.FILTER_CUTOFF, 5000, 10000);
    expect(result).toBeCloseTo(10000, 0);
  });
});
