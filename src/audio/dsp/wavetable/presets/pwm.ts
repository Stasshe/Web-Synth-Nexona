import type { Wavetable } from "../wavetableTypes";
import { NUM_FRAMES, buildSineLookup, normalize, addHarmonic } from "../wavetableCommon";

export function generatePWM(tableSize: number): Wavetable {
  const sineLut = buildSineLookup(tableSize);
  const frames: Float32Array[] = [];
  const numH = 64;

  for (let f = 0; f < NUM_FRAMES; f++) {
    const table = new Float32Array(tableSize + 1);
    const width = 0.05 + (f / (NUM_FRAMES - 1)) * 0.9;

    for (let h = 1; h <= numH; h++) {
      const amp = (2 / (h * Math.PI)) * Math.sin(h * Math.PI * width);
      if (Math.abs(amp) > 1e-8) {
        addHarmonic(table, sineLut, tableSize, h, amp);
      }
    }

    normalize(table, tableSize);
    table[tableSize] = table[0];
    frames.push(table);
  }

  return { frames, tableSize, numFrames: NUM_FRAMES };
}
