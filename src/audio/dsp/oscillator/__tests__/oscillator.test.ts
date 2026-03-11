import { describe, expect, it } from "vitest";
import { Oscillator } from "../oscillator";
import { generateSineTable } from "../../wavetable/wavetableEngine";

describe("Oscillator", () => {
  const SR = 48000;

  it("outputs silence without wavetable", () => {
    const osc = new Oscillator(SR);
    expect(osc.process()).toBe(0);
  });

  it("outputs sine wave with sine table", () => {
    const osc = new Oscillator(SR);
    osc.setWavetable(generateSineTable(2048));
    osc.setFrequency(440);

    const samples: number[] = [];
    for (let i = 0; i < SR; i++) {
      samples.push(osc.process());
    }

    // Check output is bounded
    const max = Math.max(...samples);
    const min = Math.min(...samples);
    expect(max).toBeLessThanOrEqual(1.001);
    expect(min).toBeGreaterThanOrEqual(-1.001);

    // Check RMS is close to 1/sqrt(2) for sine wave
    const rms = Math.sqrt(samples.reduce((s, v) => s + v * v, 0) / samples.length);
    expect(rms).toBeCloseTo(1 / Math.sqrt(2), 1);
  });

  it("produces correct frequency", () => {
    const osc = new Oscillator(SR);
    osc.setWavetable(generateSineTable(2048));
    osc.setFrequency(1000);

    // Count zero crossings in 1 second
    const samples: number[] = [];
    for (let i = 0; i < SR; i++) {
      samples.push(osc.process());
    }
    let crossings = 0;
    for (let i = 1; i < samples.length; i++) {
      if ((samples[i - 1] >= 0 && samples[i] < 0) || (samples[i - 1] < 0 && samples[i] >= 0)) {
        crossings++;
      }
    }
    // 1000 Hz sine = ~2000 zero crossings/sec
    expect(crossings).toBeGreaterThan(1900);
    expect(crossings).toBeLessThan(2100);
  });
});
