import { describe, expect, it } from "vitest";
import { midiToFreq, centsToRatio, clamp } from "../math";

describe("math utilities", () => {
  it("midiToFreq: A4 = 440 Hz", () => {
    expect(midiToFreq(69)).toBeCloseTo(440, 5);
  });

  it("midiToFreq: C4 = 261.63 Hz", () => {
    expect(midiToFreq(60)).toBeCloseTo(261.626, 1);
  });

  it("centsToRatio: 1200 cents = octave", () => {
    expect(centsToRatio(1200)).toBeCloseTo(2, 5);
  });

  it("centsToRatio: 0 cents = unity", () => {
    expect(centsToRatio(0)).toBe(1);
  });

  it("clamp bounds values", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });
});
