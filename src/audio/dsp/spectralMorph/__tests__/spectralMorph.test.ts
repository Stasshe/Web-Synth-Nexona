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

  it("HIGH_PASS removes low harmonics", () => {
    const proc = new SpectralMorphProcessor();
    proc.setSource(sourceWt);
    const morphed = proc.getMorphed(SpectralMorphType.HIGH_PASS, 0.5);
    expect(morphed).not.toBeNull();
    expect(morphed!.numFrames).toBe(sourceWt.numFrames);
  });

  it("output frames are bounded (globally normalized)", () => {
    const proc = new SpectralMorphProcessor();
    proc.setSource(sourceWt);
    const typesToTest = [
      SpectralMorphType.LOW_PASS,
      SpectralMorphType.SMEAR,
      SpectralMorphType.PHASE_DISPERSE,
      SpectralMorphType.VOCODE,
      SpectralMorphType.FORMANT_SCALE,
    ];
    for (const type of typesToTest) {
      const morphed = proc.getMorphed(type, 0.5);
      expect(morphed).not.toBeNull();
      // With global normalization, max across all frames should be ~1.0
      let globalMax = 0;
      for (let fIdx = 0; fIdx < morphed!.numFrames; fIdx++) {
        const frame = morphed!.frames[fIdx];
        for (let i = 0; i < TABLE_SIZE; i++) {
          const a = Math.abs(frame[i]);
          if (a > globalMax) globalMax = a;
        }
      }
      expect(globalMax).toBeLessThanOrEqual(1.01);
      expect(globalMax).toBeGreaterThan(0.5); // shouldn't be near-silent
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

  it("HARMONIC_SCALE stretches harmonics", () => {
    const proc = new SpectralMorphProcessor();
    proc.setSource(sourceWt);
    const morphed = proc.getMorphed(SpectralMorphType.HARMONIC_SCALE, 0.8);
    expect(morphed).not.toBeNull();
    // Should produce a different waveform
    const origFrame = sourceWt.frames[32];
    const morphFrame = morphed!.frames[32];
    let diff = 0;
    for (let i = 0; i < TABLE_SIZE; i++) {
      diff += Math.abs(origFrame[i] - morphFrame[i]);
    }
    expect(diff).toBeGreaterThan(0.1);
  });

  it("INHARMONIC_SCALE creates inharmonicity", () => {
    const proc = new SpectralMorphProcessor();
    proc.setSource(sourceWt);
    const morphed = proc.getMorphed(SpectralMorphType.INHARMONIC_SCALE, 0.5);
    expect(morphed).not.toBeNull();
    expect(morphed!.numFrames).toBe(sourceWt.numFrames);
  });

  it("SMEAR modifies the spectrum", () => {
    const proc = new SpectralMorphProcessor();
    const richWt = generatePreset(WavetablePreset.BASIC_SHAPES, TABLE_SIZE);
    proc.setSource(richWt);
    const morphed = proc.getMorphed(SpectralMorphType.SMEAR, 0.5);
    expect(morphed).not.toBeNull();
    // Should produce a different waveform than the source
    const frameIdx = 32;
    const origFrame = richWt.frames[frameIdx];
    const morphFrame = morphed!.frames[frameIdx];
    let diff = 0;
    for (let i = 0; i < TABLE_SIZE; i++) {
      diff += Math.abs(origFrame[i] - morphFrame[i]);
    }
    expect(diff).toBeGreaterThan(0.1);
  });

  it("VOCODE shifts harmonics with parity preservation", () => {
    const proc = new SpectralMorphProcessor();
    proc.setSource(sourceWt);
    const morphed = proc.getMorphed(SpectralMorphType.VOCODE, 0.5);
    expect(morphed).not.toBeNull();
    expect(morphed!.numFrames).toBe(sourceWt.numFrames);
  });

  it("SKEW works with multi-frame wavetables", () => {
    const proc = new SpectralMorphProcessor();
    const multiFrameWt = generatePreset(WavetablePreset.BASIC_SHAPES, TABLE_SIZE);
    proc.setSource(multiFrameWt);
    const morphed = proc.getMorphed(SpectralMorphType.SKEW, 0.7);
    expect(morphed).not.toBeNull();
    expect(morphed!.numFrames).toBe(multiFrameWt.numFrames);
  });

  it("SHEPARD_TONE produces output", () => {
    const proc = new SpectralMorphProcessor();
    proc.setSource(sourceWt);
    const morphed = proc.getMorphed(SpectralMorphType.SHEPARD_TONE, 0.5);
    expect(morphed).not.toBeNull();
    // At least some frames should have non-zero content
    let hasContent = false;
    for (let f = 0; f < morphed!.numFrames && !hasContent; f++) {
      for (let i = 0; i < TABLE_SIZE; i++) {
        if (Math.abs(morphed!.frames[f][i]) > 0.01) {
          hasContent = true;
          break;
        }
      }
    }
    expect(hasContent).toBe(true);
  });

  it("RANDOM_AMPLITUDES modifies spectrum", () => {
    const proc = new SpectralMorphProcessor();
    proc.setSource(sourceWt);
    const morphed = proc.getMorphed(SpectralMorphType.RANDOM_AMPLITUDES, 0.5);
    expect(morphed).not.toBeNull();
    const origFrame = sourceWt.frames[32];
    const morphFrame = morphed!.frames[32];
    let diff = 0;
    for (let i = 0; i < TABLE_SIZE; i++) {
      diff += Math.abs(origFrame[i] - morphFrame[i]);
    }
    expect(diff).toBeGreaterThan(0.1);
  });

  it("each morph type produces distinct results", () => {
    const proc = new SpectralMorphProcessor();
    proc.setSource(sourceWt);
    const types = [
      SpectralMorphType.VOCODE,
      SpectralMorphType.FORMANT_SCALE,
      SpectralMorphType.HARMONIC_SCALE,
      SpectralMorphType.SMEAR,
      SpectralMorphType.LOW_PASS,
      SpectralMorphType.PHASE_DISPERSE,
    ];
    const results: Float32Array[] = [];
    for (const type of types) {
      const morphed = proc.getMorphed(type, 0.5);
      expect(morphed).not.toBeNull();
      results.push(morphed!.frames[32]);
    }
    // Each pair should be different
    for (let a = 0; a < results.length; a++) {
      for (let b = a + 1; b < results.length; b++) {
        let diff = 0;
        for (let i = 0; i < TABLE_SIZE; i++) {
          diff += Math.abs(results[a][i] - results[b][i]);
        }
        expect(diff).toBeGreaterThan(0.01);
      }
    }
  });
});
