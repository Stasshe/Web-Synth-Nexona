import type { Wavetable } from "../wavetableTypes";
import { NUM_FRAMES, MAX_HARMONICS, buildSineLookup, normalize, addHarmonic } from "../wavetableCommon";

export function generatePluck(tableSize: number): Wavetable {
  const sineLut = buildSineLookup(tableSize);
  const frames: Float32Array[] = [];
  const numH = MAX_HARMONICS;

  for (let f = 0; f < NUM_FRAMES; f++) {
    const table = new Float32Array(tableSize + 1);
    const t = f / (NUM_FRAMES - 1);

    for (let h = 1; h <= numH; h++) {
      const decay = Math.exp(-h * t * 4);
      const amp = decay / h;
      if (amp > 1e-8) {
        addHarmonic(table, sineLut, tableSize, h, amp);
      }
    }
    normalize(table, tableSize);
    table[tableSize] = table[0];
    frames.push(table);
  }
  return { frames, tableSize, numFrames: NUM_FRAMES };
}
