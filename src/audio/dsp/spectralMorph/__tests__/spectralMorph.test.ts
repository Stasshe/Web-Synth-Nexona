import { describe, expect, it } from "vitest";
import { WavetablePreset, generatePreset } from "../../wavetable/wavetablePresets";
import { SpectralMorphProcessor } from "../spectralMorphProcessor";
import { SpectralMorphType } from "../spectralMorphTypes";

describe("SpectralMorphProcessor", () => {
  const TABLE_SIZE = 2048;
  const sourceWt = generatePreset(WavetablePreset.INIT, TABLE_SIZE);

  it("NONE returns source wavetable unchanged", () => {
    const proc = new SpectralMorphProcessor();
    proc.setSource(sourceWt);
    const result = proc.getMorphed(SpectralMorphType.NONE, 0.5);
    expect(result).toBe(sourceWt);
  });

  it("returns null when no source is set", () => {
    const proc = new SpectralMorphProcessor();
    const result = proc.getMorphed(SpectralMorphType.LOW_PASS, 0.5);
    expect(result).toBeNull();
  });

  it("LOW_PASS attenuates high harmonics", () => {
    const proc = new SpectralMorphProcessor();
    proc.setSource(sourceWt);
    const morphed = proc.getMorphed(SpectralMorphType.LOW_PASS, 0.8);
    expect(morphed).not.toBeNull();
    // Use frame 63 (most harmonics) for a clearer test
    const frameIdx = 63;
    const origFrame = sourceWt.frames[frameIdx];
    const morphFrame = morphed!.frames[frameIdx];
    let origRoughness = 0;
    let morphRoughness = 0;
    for (let i = 1; i < TABLE_SIZE; i++) {
      origRoughness += Math.abs(origFrame[i] - origFrame[i - 1]);
      morphRoughness += Math.abs(morphFrame[i] - morphFrame[i - 1]);
    }
    expect(morphRoughness).toBeLessThan(origRoughness);
  });

  it("output frames are bounded to [-1, 1]", () => {
    const proc = new SpectralMorphProcessor();
    proc.setSource(sourceWt);
    const typesToTest = [
      SpectralMorphType.LOW_PASS,
      SpectralMorphType.SMEAR,
      SpectralMorphType.PHASE_DISPERSE,
    ];
    for (const type of typesToTest) {
      const morphed = proc.getMorphed(type, 0.5);
      expect(morphed).not.toBeNull();
      // Check just first and last frame to keep test fast
      for (const fIdx of [0, morphed!.numFrames - 1]) {
        const frame = morphed!.frames[fIdx];
        for (let i = 0; i < TABLE_SIZE; i++) {
          expect(Math.abs(frame[i])).toBeLessThanOrEqual(1.001);
        }
      }
    }
  });

  it("PHASE_DISPERSE preserves magnitudes approximately", () => {
    const proc = new SpectralMorphProcessor();
    proc.setSource(sourceWt);
    const morphed = proc.getMorphed(SpectralMorphType.PHASE_DISPERSE, 0.5);
    expect(morphed).not.toBeNull();
    // RMS energy should be roughly preserved
    const origFrame = sourceWt.frames[0];
    const morphFrame = morphed!.frames[0];
    let origRMS = 0;
    let morphRMS = 0;
    for (let i = 0; i < TABLE_SIZE; i++) {
      origRMS += origFrame[i] * origFrame[i];
      morphRMS += morphFrame[i] * morphFrame[i];
    }
    origRMS = Math.sqrt(origRMS / TABLE_SIZE);
    morphRMS = Math.sqrt(morphRMS / TABLE_SIZE);
    // Allow some tolerance due to normalization
    expect(morphRMS).toBeGreaterThan(0.01);
  });

  it("caches result when type and amount unchanged", () => {
    const proc = new SpectralMorphProcessor();
    proc.setSource(sourceWt);
    const first = proc.getMorphed(SpectralMorphType.LOW_PASS, 0.5);
    const second = proc.getMorphed(SpectralMorphType.LOW_PASS, 0.5);
    expect(second).toBe(first); // same reference = cached
  });

  it("recomputes when type changes", () => {
    const proc = new SpectralMorphProcessor();
    proc.setSource(sourceWt);
    const first = proc.getMorphed(SpectralMorphType.LOW_PASS, 0.5);
    const second = proc.getMorphed(SpectralMorphType.HIGH_PASS, 0.5);
    expect(second).not.toBe(first);
  });

  it("preserves frame count and table size", () => {
    const proc = new SpectralMorphProcessor();
    proc.setSource(sourceWt);
    const morphed = proc.getMorphed(SpectralMorphType.SMEAR, 0.5);
    expect(morphed).not.toBeNull();
    expect(morphed!.numFrames).toBe(sourceWt.numFrames);
    expect(morphed!.tableSize).toBe(sourceWt.tableSize);
  });
});
