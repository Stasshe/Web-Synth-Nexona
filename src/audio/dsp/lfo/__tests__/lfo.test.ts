import { describe, expect, it } from "vitest";
import { LFO, LfoShape } from "../lfo";

describe("LFO", () => {
  const SR = 48000;

  it("sine LFO output is bounded to [-1, 1]", () => {
    const lfo = new LFO(SR);
    lfo.setParams(5, LfoShape.SINE);
    for (let i = 0; i < 1000; i++) {
      const v = lfo.process();
      expect(v).toBeGreaterThanOrEqual(-1);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it("square LFO alternates between 1 and -1", () => {
    const lfo = new LFO(SR);
    lfo.setParams(1, LfoShape.SQUARE);
    const values = new Set<number>();
    for (let i = 0; i < 1000; i++) {
      values.add(lfo.process());
    }
    expect(values.has(1)).toBe(true);
    expect(values.has(-1)).toBe(true);
    expect(values.size).toBe(2);
  });

  it("triangle LFO is bounded", () => {
    const lfo = new LFO(SR);
    lfo.setParams(3, LfoShape.TRIANGLE);
    for (let i = 0; i < 1000; i++) {
      const v = lfo.process();
      expect(v).toBeGreaterThanOrEqual(-1.01);
      expect(v).toBeLessThanOrEqual(1.01);
    }
  });
});
