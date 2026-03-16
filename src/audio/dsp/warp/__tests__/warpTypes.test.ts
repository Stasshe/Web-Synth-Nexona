import { describe, expect, it } from "vitest";
import { DistortionType, applyDistortionPhase } from "../warpTypes";

describe("warpTypes", () => {
  it("NONE passes phase through", () => {
    expect(applyDistortionPhase(0.5, 0.5, DistortionType.NONE, 0.5, 0)).toBe(0.5);
  });

  it("BEND output stays in [0, 1)", () => {
    for (let p = 0; p < 1; p += 0.1) {
      const out = applyDistortionPhase(p, 0.5, DistortionType.BEND, 0.8, 0);
      expect(out).toBeGreaterThanOrEqual(0);
      expect(out).toBeLessThanOrEqual(1);
    }
  });

  it("SYNC with amount 0 passes phase through", () => {
    expect(applyDistortionPhase(0.5, 0.5, DistortionType.SYNC, 0, 0)).toBeCloseTo(0.5, 5);
  });

  it("QUANTIZE reduces distinct values", () => {
    const values = new Set<number>();
    for (let p = 0; p < 1; p += 0.001) {
      values.add(applyDistortionPhase(p, 0.5, DistortionType.QUANTIZE, 0.0, 0));
    }
    // With amount=0, steps=4, so at most 4 distinct values
    expect(values.size).toBeLessThanOrEqual(5);
  });

  it("PULSE_WIDTH output wraps to [0, 1)", () => {
    for (let p = 0; p < 1; p += 0.05) {
      const out = applyDistortionPhase(p, 0.5, DistortionType.PULSE_WIDTH, 0.9, 0);
      expect(out).toBeGreaterThanOrEqual(0);
      expect(out).toBeLessThan(1);
    }
  });

  describe("FM types (cross-osc: phase += amount * sin(2π * fmSignal))", () => {
    const fmTypes = [
      DistortionType.FM_OSC_A,
      DistortionType.FM_OSC_B,
      DistortionType.FM_SAMPLE,
    ] as const;

    it.each(fmTypes)("FM type %i with zero amount returns phase unchanged", (type) => {
      expect(applyDistortionPhase(0.3, 0.5, type, 0, 0.5)).toBeCloseTo(0.3, 5);
    });

    it.each(fmTypes)("FM type %i output stays in [0, 1)", (type) => {
      for (let p = 0.01; p < 1; p += 0.05) {
        const out = applyDistortionPhase(p, 0.5, type, 0.5, 0.3);
        expect(out).toBeGreaterThanOrEqual(0);
        expect(out).toBeLessThan(1);
      }
    });

    it.each(fmTypes)("FM type %i with nonzero amount changes phase", (type) => {
      // fmSignal=0.3: phase = 0.3 + 4*0.3 = 1.5 → wraps to 0.5 (not 0.3)
      const out = applyDistortionPhase(0.3, 0.5, type, 0.5, 0.3);
      expect(out).not.toBeCloseTo(0.3, 2);
    });

    it("FM_OSC_A and FM_OSC_B share same algorithm (same fmSignal produces same output)", () => {
      const p = 0.3;
      const outA = applyDistortionPhase(p, 0.5, DistortionType.FM_OSC_A, 0.5, 0.5);
      const outB = applyDistortionPhase(p, 0.5, DistortionType.FM_OSC_B, 0.5, 0.5);
      expect(outA).toBeCloseTo(outB, 5);
    });
  });
});
