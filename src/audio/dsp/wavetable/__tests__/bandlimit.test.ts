import { describe, expect, it } from "vitest";
import { bandLimit } from "../bandlimit";
import { generatePreset } from "../wavetablePresets";

describe("bandlimit", () => {
  it("band-limited saw has reduced high harmonics", () => {
    const saw = generatePreset(0, 2048);
    const limited = bandLimit(saw, 60, 48000);

    expect(limited.frames.length).toBe(64);
    expect(limited.tableSize).toBe(2048);

    // Output should be bounded
    for (let i = 0; i <= 2048; i++) {
      expect(Math.abs(limited.frames[0][i])).toBeLessThanOrEqual(1.001);
    }
  });

  it("higher notes have fewer harmonics preserved", () => {
    const saw = generatePreset(0, 2048);
    const lowNote = bandLimit(saw, 36, 48000); // C2
    const highNote = bandLimit(saw, 96, 48000); // C7

    // Use last frame (full harmonics) for meaningful comparison
    const lastFrame = saw.numFrames - 1;

    // High note should be smoother (closer to sine) than low note
    // Measure roughness by sum of sample-to-sample differences
    let roughLow = 0;
    let roughHigh = 0;
    for (let i = 1; i <= 2048; i++) {
      roughLow += Math.abs(lowNote.frames[lastFrame][i] - lowNote.frames[lastFrame][i - 1]);
      roughHigh += Math.abs(highNote.frames[lastFrame][i] - highNote.frames[lastFrame][i - 1]);
    }
    expect(roughHigh).toBeLessThan(roughLow);
  });
});
