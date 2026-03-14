import type { Wavetable } from "../wavetableTypes";
import {
  NUM_FRAMES,
  MIN_HARMONICS,
  MAX_HARMONICS,
  buildSineLookup,
  normalize,
  addHarmonic,
} from "../wavetableCommon";

export function generateInit(tableSize: number): Wavetable {
  const sineLut = buildSineLookup(tableSize);
  const frames: Float32Array[] = [];

  for (let f = 0; f < NUM_FRAMES; f++) {
    const table = new Float32Array(tableSize + 1);
    const numH =
      MIN_HARMONICS + Math.floor((f / (NUM_FRAMES - 1)) * (MAX_HARMONICS - MIN_HARMONICS));

    for (let h = 1; h <= numH; h++) {
      addHarmonic(table, sineLut, tableSize, h, 1 / h);
    }

    normalize(table, tableSize);
    table[tableSize] = table[0];
    frames.push(table);
  }

  return { frames, tableSize, numFrames: NUM_FRAMES };
}
