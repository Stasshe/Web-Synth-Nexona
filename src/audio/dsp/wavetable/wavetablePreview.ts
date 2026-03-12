import { SpectralMorphProcessor } from "../spectralMorph/spectralMorphProcessor";
import type { SpectralMorphType } from "../spectralMorph/spectralMorphTypes";
import { generatePreset } from "./wavetablePresets";
import type { Wavetable } from "./wavetablePresets";

const PREVIEW_SIZE = 128;

/** Cache generated wavetables so we don't re-generate on every slider tick */
const wtCache = new Map<number, Wavetable>();

function getWavetable(presetIndex: number): Wavetable {
  let wt = wtCache.get(presetIndex);
  if (!wt) {
    wt = generatePreset(presetIndex, 2048);
    wtCache.set(presetIndex, wt);
  }
  return wt;
}

/** Cache for SpectralMorphProcessor instances per preset */
const morphProcCache = new Map<number, SpectralMorphProcessor>();

/** Cache key for morphed wavetable results */
interface MorphCacheEntry {
  type: number;
  amount: number;
  wavetable: Wavetable;
}
const morphResultCache = new Map<number, MorphCacheEntry>();

function getMorphProcessor(presetIndex: number): SpectralMorphProcessor {
  let proc = morphProcCache.get(presetIndex);
  if (!proc) {
    proc = new SpectralMorphProcessor();
    proc.setSource(getWavetable(presetIndex));
    morphProcCache.set(presetIndex, proc);
  }
  return proc;
}

/**
 * Sample a single frame from a wavetable, down-sampling from tableSize to
 * `PREVIEW_SIZE` with linear interpolation.
 */
function sampleFrame(frame: Float32Array, tableSize: number): Float32Array {
  const out = new Float32Array(PREVIEW_SIZE);
  for (let i = 0; i < PREVIEW_SIZE; i++) {
    const pos = (i / PREVIEW_SIZE) * tableSize;
    const lo = Math.floor(pos);
    const hi = lo + 1;
    const frac = pos - lo;
    out[i] = frame[lo] * (1 - frac) + frame[hi] * frac;
  }
  return out;
}

/** Sample a frame from a wavetable with frame interpolation */
function sampleWavetableAtFrame(wt: Wavetable, framePosition: number): Float32Array {
  const numFrames = wt.numFrames;
  const tableSize = wt.tableSize;

  const frameIdx = framePosition * (numFrames - 1);
  const loFrame = Math.floor(frameIdx);
  const hiFrame = Math.min(loFrame + 1, numFrames - 1);
  const frameFrac = frameIdx - loFrame;

  if (frameFrac < 0.001 || loFrame === hiFrame) {
    return sampleFrame(wt.frames[loFrame], tableSize);
  }

  const loSamples = sampleFrame(wt.frames[loFrame], tableSize);
  const hiSamples = sampleFrame(wt.frames[hiFrame], tableSize);
  const out = new Float32Array(PREVIEW_SIZE);
  for (let i = 0; i < PREVIEW_SIZE; i++) {
    out[i] = loSamples[i] * (1 - frameFrac) + hiSamples[i] * frameFrac;
  }
  return out;
}

/**
 * Get preview samples for a wavetable preset at a given frame position.
 *
 * Uses the real generated wavetable data with frame interpolation,
 * so the preview is an exact visual match to the actual DSP output.
 */
export function computePreviewSamples(
  waveformType: number,
  framePosition: number,
  customWaveform: readonly number[] | null,
): Float32Array {
  // Custom waveform: resample directly
  if (customWaveform && customWaveform.length > 1) {
    const out = new Float32Array(PREVIEW_SIZE);
    const srcLen = customWaveform.length;
    for (let i = 0; i < PREVIEW_SIZE; i++) {
      const t = (i / PREVIEW_SIZE) * (srcLen - 1);
      const lo = Math.floor(t);
      const hi = Math.min(lo + 1, srcLen - 1);
      const frac = t - lo;
      out[i] = customWaveform[lo] * (1 - frac) + customWaveform[hi] * frac;
    }
    return out;
  }

  // Invalid / custom sentinel
  if (waveformType < 0) {
    return new Float32Array(PREVIEW_SIZE);
  }

  return sampleWavetableAtFrame(getWavetable(waveformType), framePosition);
}

/**
 * Get preview samples with spectral morph applied.
 * Returns morphed waveform when morph type is active (non-zero),
 * otherwise delegates to the standard computePreviewSamples.
 */
export function computeMorphedPreviewSamples(
  waveformType: number,
  framePosition: number,
  customWaveform: readonly number[] | null,
  spectralMorphType: number,
  spectralMorphAmount: number,
): Float32Array {
  // No morph active — use standard preview
  if (spectralMorphType === 0 || waveformType < 0) {
    return computePreviewSamples(waveformType, framePosition, customWaveform);
  }

  // Custom waveforms don't support spectral morph preview
  if (customWaveform && customWaveform.length > 1) {
    return computePreviewSamples(waveformType, framePosition, customWaveform);
  }

  // Check cache for morphed wavetable
  const cached = morphResultCache.get(waveformType);
  const quantizedAmount = Math.round(spectralMorphAmount * 127) / 127;
  let morphedWt: Wavetable | null = null;

  if (cached && cached.type === spectralMorphType && cached.amount === quantizedAmount) {
    morphedWt = cached.wavetable;
  } else {
    const proc = getMorphProcessor(waveformType);
    morphedWt = proc.getMorphed(spectralMorphType as SpectralMorphType, spectralMorphAmount);
    if (morphedWt) {
      morphResultCache.set(waveformType, {
        type: spectralMorphType,
        amount: quantizedAmount,
        wavetable: morphedWt,
      });
    }
  }

  if (!morphedWt) {
    return computePreviewSamples(waveformType, framePosition, customWaveform);
  }

  return sampleWavetableAtFrame(morphedWt, framePosition);
}

/** Invalidate the cache for a specific preset (e.g. after hot-reload) */
export function invalidatePreviewCache(presetIndex?: number): void {
  if (presetIndex !== undefined) {
    wtCache.delete(presetIndex);
    morphProcCache.delete(presetIndex);
    morphResultCache.delete(presetIndex);
  } else {
    wtCache.clear();
    morphProcCache.clear();
    morphResultCache.clear();
  }
}
