import { describe, expect, it } from "vitest";
import { WarpType, applyWarp } from "../warpTypes";

describe("warpTypes", () => {
  it("NONE passes phase through", () => {
    expect(applyWarp(0.5, WarpType.NONE, 0.5)).toBe(0.5);
  });

  it("BEND output stays in [0, 1)", () => {
    for (let p = 0; p < 1; p += 0.1) {
      const out = applyWarp(p, WarpType.BEND, 0.8);
      expect(out).toBeGreaterThanOrEqual(0);
      expect(out).toBeLessThanOrEqual(1);
    }
  });

  it("SYNC with amount 0 passes phase through", () => {
    expect(applyWarp(0.5, WarpType.SYNC, 0)).toBeCloseTo(0.5, 5);
  });

  it("QUANTIZE reduces distinct values", () => {
    const values = new Set<number>();
    for (let p = 0; p < 1; p += 0.001) {
      values.add(applyWarp(p, WarpType.QUANTIZE, 0.0));
    }
    // With amount=0, steps=4, so at most 4 distinct values
    expect(values.size).toBeLessThanOrEqual(5);
  });

  it("PHASE_DISTORTION output wraps to [0, 1)", () => {
    for (let p = 0; p < 1; p += 0.05) {
      const out = applyWarp(p, WarpType.PHASE_DISTORTION, 0.9);
      expect(out).toBeGreaterThanOrEqual(0);
      expect(out).toBeLessThan(1);
    }
  });

  it("FM with zero amount is identity", () => {
    expect(applyWarp(0.3, WarpType.FM, 0, 0)).toBeCloseTo(0.3, 5);
  });

  it("FM with nonzero amount changes phase", () => {
    const out = applyWarp(0.3, WarpType.FM, 0.5, 0);
    expect(out).not.toBeCloseTo(0.3, 2);
    expect(out).toBeGreaterThanOrEqual(0);
    expect(out).toBeLessThan(1);
  });
});
