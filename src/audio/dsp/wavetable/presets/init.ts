import type { Wavetable } from "../wavetableTypes";
import { NUM_FRAMES, buildSineLookup, normalize, addHarmonic } from "../wavetableCommon";

// Vital's Init wavetable: a single static bandlimited sawtooth (1/h harmonics).
// All frames are identical, just like Vital's default single-keyframe saw.
export function generateInit(tableSize: number): Wavetable {
  const sineLut = buildSineLookup(tableSize);
  const base = new Float32Array(tableSize + 1);
  const maxH = Math.floor(tableSize / 2);
  for (let h = 1; h <= maxH; h++) {
    addHarmonic(base, sineLut, tableSize, h, 1 / h);
  }
  normalize(base, tableSize);
  base[tableSize] = base[0];

  const frames: Float32Array[] = [];
  for (let f = 0; f < NUM_FRAMES; f++) {
    frames.push(new Float32Array(base));
  }
  return { frames, tableSize, numFrames: NUM_FRAMES };
}
