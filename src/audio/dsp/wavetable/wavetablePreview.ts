import { generatePreset } from "./wavetablePresets";
import type { Wavetable } from "./wavetableEngine";

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

  const wt = getWavetable(waveformType);
  const numFrames = wt.numFrames;
  const tableSize = wt.tableSize;

  // Compute fractional frame index
  const frameIdx = framePosition * (numFrames - 1);
  const loFrame = Math.floor(frameIdx);
  const hiFrame = Math.min(loFrame + 1, numFrames - 1);
  const frameFrac = frameIdx - loFrame;

  // If exactly on a frame, just sample it
  if (frameFrac < 0.001 || loFrame === hiFrame) {
    return sampleFrame(wt.frames[loFrame], tableSize);
  }

  // Interpolate between two adjacent frames
  const loSamples = sampleFrame(wt.frames[loFrame], tableSize);
  const hiSamples = sampleFrame(wt.frames[hiFrame], tableSize);
  const out = new Float32Array(PREVIEW_SIZE);
  for (let i = 0; i < PREVIEW_SIZE; i++) {
    out[i] = loSamples[i] * (1 - frameFrac) + hiSamples[i] * frameFrac;
  }
  return out;
}

/** Invalidate the cache for a specific preset (e.g. after hot-reload) */
export function invalidatePreviewCache(presetIndex?: number): void {
  if (presetIndex !== undefined) {
    wtCache.delete(presetIndex);
  } else {
    wtCache.clear();
  }
}
