import { describe, expect, it } from "vitest";
import { PRESET_COUNT, PRESET_NAMES, WavetablePreset, generatePreset } from "../wavetablePresets";

describe("wavetablePresets", () => {
  const TABLE_SIZE = 2048;

  it("PRESET_COUNT matches PRESET_NAMES entries", () => {
    expect(PRESET_COUNT).toBe(Object.keys(PRESET_NAMES).length);
    expect(PRESET_COUNT).toBe(16);
  });

  it("every preset has a name", () => {
    for (let i = 0; i < PRESET_COUNT; i++) {
      expect(PRESET_NAMES[i]).toBeDefined();
      expect(typeof PRESET_NAMES[i]).toBe("string");
    }
  });

  const presetCases = [
    WavetablePreset.INIT,
    WavetablePreset.BASIC_SHAPES,
    WavetablePreset.PWM,
    WavetablePreset.FORMANT,
    WavetablePreset.ADDITIVE,
    WavetablePreset.DIGITAL,
    WavetablePreset.PLUCK,
    WavetablePreset.ORGAN,
    WavetablePreset.VOWEL,
    WavetablePreset.METALLIC,
    WavetablePreset.HARSH,
    WavetablePreset.WARM_PAD,
    WavetablePreset.SYNC_SWEEP,
    WavetablePreset.NOISE_SHAPE,
    WavetablePreset.BELL,
    WavetablePreset.CHOIR,
  ];

  for (const preset of presetCases) {
    const name = PRESET_NAMES[preset];

    describe(`preset: ${name}`, () => {
      const wt = generatePreset(preset, TABLE_SIZE);

      it("generates 64 frames", () => {
        expect(wt.numFrames).toBe(64);
        expect(wt.frames.length).toBe(64);
      });

      it("has correct table size", () => {
        expect(wt.tableSize).toBe(TABLE_SIZE);
      });

      it("each frame has tableSize + 1 samples (wrap-around)", () => {
        for (const frame of wt.frames) {
          expect(frame.length).toBe(TABLE_SIZE + 1);
        }
      });

      it("frames are normalized to [-1, 1]", () => {
        for (let f = 0; f < wt.frames.length; f++) {
          const frame = wt.frames[f];
          let max = 0;
          for (let i = 0; i < TABLE_SIZE; i++) {
            max = Math.max(max, Math.abs(frame[i]));
          }
          expect(max).toBeLessThanOrEqual(1.001);
          // First frame of some presets (e.g. Organ) may be silent due to fade-in
          if (f > 0) {
            expect(max).toBeGreaterThan(0.001);
          }
        }
      });

      it("wrap-around sample matches first sample", () => {
        for (const frame of wt.frames) {
          expect(frame[TABLE_SIZE]).toBeCloseTo(frame[0], 5);
        }
      });
    });
  }
});
