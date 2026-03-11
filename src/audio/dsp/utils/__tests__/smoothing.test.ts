import { describe, expect, it } from "vitest";
import { ParamSmoother } from "../smoothing";

describe("ParamSmoother", () => {
  it("starts at initial value", () => {
    const s = new ParamSmoother(1.0);
    expect(s.current).toBe(1.0);
    expect(s.target).toBe(1.0);
  });

  it("moves toward target on tick", () => {
    const s = new ParamSmoother(0.0, 0.1);
    s.setTarget(1.0);
    s.tick();
    expect(s.current).toBeCloseTo(0.1, 5);
  });

  it("converges to target after many ticks", () => {
    const s = new ParamSmoother(0.0, 0.1);
    s.setTarget(1.0);
    for (let i = 0; i < 1000; i++) s.tick();
    expect(s.current).toBeCloseTo(1.0, 5);
  });

  it("snap jumps to target immediately", () => {
    const s = new ParamSmoother(0.0, 0.001);
    s.setTarget(5.0);
    s.snap();
    expect(s.current).toBe(5.0);
  });
});
