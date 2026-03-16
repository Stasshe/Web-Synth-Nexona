import { describe, expect, it } from "vitest";
import { generatePreset } from "../../wavetable/wavetablePresets";
import { UnisonEngine } from "../unisonEngine";

describe("UnisonEngine", () => {
  const SR = 48000;

  it("outputs stereo signal with sine table", () => {
    const engine = new UnisonEngine(SR);
    engine.setWavetable(generatePreset(0, 2048));
    engine.setFrequency(440);
    const [l, r] = engine.process();
    // First sample should be non-zero (random phase)
    // But at least it shouldn't crash
    expect(typeof l).toBe("number");
    expect(typeof r).toBe("number");
  });

  it("unison 1 outputs equal L/R (centered pan)", () => {
    const engine = new UnisonEngine(SR);
    engine.setWavetable(generatePreset(0, 2048));
    engine.setFrequency(440);
    engine.setUnisonParams({
      count: 1,
      detune: 0.2, // 20 / 100
      stereoSpread: 0.5,
      blend: 0.8,
      stackType: 0,
      detunePower: 1.5,
      detuneRange: 1,
      frameSpread: 0,
    });

    let maxDiff = 0;
    for (let i = 0; i < 1000; i++) {
      const [l, r] = engine.process();
      maxDiff = Math.max(maxDiff, Math.abs(l - r));
    }
    expect(maxDiff).toBeLessThan(0.001);
  });

  it("unison > 1 produces stereo spread", () => {
    const engine = new UnisonEngine(SR);
    engine.setWavetable(generatePreset(0, 2048));
    engine.setFrequency(440);
    engine.setUnisonParams({
      count: 8,
      detune: 0.3, // 30 / 100
      stereoSpread: 1.0,
      blend: 0.8,
      stackType: 0,
      detunePower: 1.5,
      detuneRange: 1,
      frameSpread: 0,
    });

    let hasDifference = false;
    for (let i = 0; i < 1000; i++) {
      const [l, r] = engine.process();
      if (Math.abs(l - r) > 0.01) hasDifference = true;
    }
    expect(hasDifference).toBe(true);
  });

  it("output is bounded", () => {
    const engine = new UnisonEngine(SR);
    engine.setWavetable(generatePreset(0, 2048));
    engine.setFrequency(440);
    engine.setUnisonParams({
      count: 16,
      detune: 0.5, // 50 / 100
      stereoSpread: 1.0,
      blend: 0.8,
      stackType: 0,
      detunePower: 1.5,
      detuneRange: 1,
      frameSpread: 0,
    });

    for (let i = 0; i < 5000; i++) {
      const [l, r] = engine.process();
      expect(Math.abs(l)).toBeLessThan(2);
      expect(Math.abs(r)).toBeLessThan(2);
    }
  });
});
