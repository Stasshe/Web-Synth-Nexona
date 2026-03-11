import { describe, expect, it } from "vitest";
import { FilterType, SVFilter } from "../svf";

describe("SVFilter", () => {
  const SR = 48000;

  it("passes DC through lowpass", () => {
    const f = new SVFilter(SR);
    f.setParams(1000, 0.0, 1, FilterType.LOWPASS);
    let out = 0;
    for (let i = 0; i < 1000; i++) {
      out = f.process(1.0);
    }
    expect(out).toBeCloseTo(1.0, 1);
  });

  it("blocks DC through highpass", () => {
    const f = new SVFilter(SR);
    f.setParams(1000, 0.0, 1, FilterType.HIGHPASS);
    let out = 0;
    for (let i = 0; i < 1000; i++) {
      out = f.process(1.0);
    }
    expect(Math.abs(out)).toBeLessThan(0.01);
  });

  it("attenuates high frequencies in lowpass", () => {
    const f = new SVFilter(SR);
    f.setParams(200, 0.0, 1, FilterType.LOWPASS);
    const highFreqSamples: number[] = [];
    for (let i = 0; i < 2000; i++) {
      const input = Math.sin(2 * Math.PI * 10000 * (i / SR));
      highFreqSamples.push(f.process(input));
    }
    const rms = Math.sqrt(highFreqSamples.slice(-500).reduce((s, v) => s + v * v, 0) / 500);
    expect(rms).toBeLessThan(0.1);
  });

  it("reset clears state", () => {
    const f = new SVFilter(SR);
    f.setParams(1000, 0.0, 1, FilterType.LOWPASS);
    for (let i = 0; i < 100; i++) f.process(1.0);
    f.reset();
    expect(f.process(0)).toBeCloseTo(0, 5);
  });

  it("drive applies saturation", () => {
    const f = new SVFilter(SR);
    f.setParams(20000, 0.0, 5, FilterType.LOWPASS);
    const out = f.process(2.0);
    expect(Math.abs(out)).toBeLessThan(2.0);
  });
});
