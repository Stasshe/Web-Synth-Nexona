import { describe, expect, it } from "vitest";
import { generatePreset } from "../../wavetable/wavetablePresets";
import { Oscillator } from "../oscillator";

describe("Oscillator", () => {
  const SR = 48000;

  it("outputs silence without wavetable", () => {
    const osc = new Oscillator(SR);
    expect(osc.process()).toBe(0);
  });

  it("outputs bounded waveform with wavetable loaded", () => {
    const osc = new Oscillator(SR);
    osc.setWavetable(generatePreset(0, 2048));
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

    // Check RMS is non-trivial (producing sound)
    const rms = Math.sqrt(samples.reduce((s, v) => s + v * v, 0) / samples.length);
    expect(rms).toBeGreaterThan(0.1);
  });

  it("produces correct frequency", () => {
    const osc = new Oscillator(SR);
    osc.setWavetable(generatePreset(0, 2048));
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
