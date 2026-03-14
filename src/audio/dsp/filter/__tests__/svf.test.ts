import { describe, expect, it } from "vitest";
import { SVFilter } from "../svf";

describe("SVFilter", () => {
  const SR = 48000;

  it("passes DC through lowpass output", () => {
    const f = new SVFilter();
    f.setCoeffs(1000, 0.0, SR);
    let lp = 0;
    for (let i = 0; i < 1000; i++) {
      [lp] = f.tick(1.0);
    }
    expect(lp).toBeCloseTo(1.0, 1);
  });

  it("blocks DC through highpass output", () => {
    const f = new SVFilter();
    f.setCoeffs(1000, 0.0, SR);
    let hp = 0;
    for (let i = 0; i < 1000; i++) {
      [, , hp] = f.tick(1.0);
    }
    expect(Math.abs(hp)).toBeLessThan(0.01);
  });

  it("attenuates high frequencies in lowpass", () => {
    const f = new SVFilter();
    f.setCoeffs(200, 0.0, SR);
    const highFreqSamples: number[] = [];
    for (let i = 0; i < 2000; i++) {
      const input = Math.sin(2 * Math.PI * 10000 * (i / SR));
      const [lp] = f.tick(input);
      highFreqSamples.push(lp);
    }
    const rms = Math.sqrt(highFreqSamples.slice(-500).reduce((s, v) => s + v * v, 0) / 500);
    expect(rms).toBeLessThan(0.1);
  });

  it("reset clears state", () => {
    const f = new SVFilter();
    f.setCoeffs(1000, 0.0, SR);
    for (let i = 0; i < 100; i++) f.tick(1.0);
    f.reset();
    const [lp] = f.tick(0);
    expect(lp).toBeCloseTo(0, 5);
  });
});
