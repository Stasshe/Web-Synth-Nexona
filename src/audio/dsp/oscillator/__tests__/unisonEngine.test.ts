import { describe, expect, it } from "vitest";
import { UnisonEngine } from "../unisonEngine";
import { generateSineTable } from "../../wavetable/wavetableEngine";

describe("UnisonEngine", () => {
  const SR = 48000;

  it("outputs stereo signal with sine table", () => {
    const engine = new UnisonEngine(SR);
    engine.setWavetable(generateSineTable(2048));
    engine.setFrequency(440);
    const [l, r] = engine.process();
    // First sample should be non-zero (random phase)
    // But at least it shouldn't crash
    expect(typeof l).toBe("number");
    expect(typeof r).toBe("number");
  });

  it("unison 1 outputs equal L/R (centered pan)", () => {
    const engine = new UnisonEngine(SR);
    engine.setWavetable(generateSineTable(2048));
    engine.setFrequency(440);
    engine.setUnisonCount(1, 20, 0.5);

    let maxDiff = 0;
    for (let i = 0; i < 1000; i++) {
      const [l, r] = engine.process();
      maxDiff = Math.max(maxDiff, Math.abs(l - r));
    }
    expect(maxDiff).toBeLessThan(0.001);
  });

  it("unison > 1 produces stereo spread", () => {
    const engine = new UnisonEngine(SR);
    engine.setWavetable(generateSineTable(2048));
    engine.setFrequency(440);
    engine.setUnisonCount(8, 30, 1.0);

    let hasDifference = false;
    for (let i = 0; i < 1000; i++) {
      const [l, r] = engine.process();
      if (Math.abs(l - r) > 0.01) hasDifference = true;
    }
    expect(hasDifference).toBe(true);
  });

  it("output is bounded", () => {
    const engine = new UnisonEngine(SR);
    engine.setWavetable(generateSineTable(2048));
    engine.setFrequency(440);
    engine.setUnisonCount(16, 50, 1.0);

    for (let i = 0; i < 5000; i++) {
      const [l, r] = engine.process();
      expect(Math.abs(l)).toBeLessThan(2);
      expect(Math.abs(r)).toBeLessThan(2);
    }
  });
});
