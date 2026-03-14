import type { Wavetable } from "../wavetableTypes";
import { NUM_FRAMES, buildSineLookup, normalize, addHarmonic } from "../wavetableCommon";

export function generateBasicShapes(tableSize: number): Wavetable {
  const sineLut = buildSineLookup(tableSize);
  const frames: Float32Array[] = [];
  const numH = 64;

  for (let f = 0; f < NUM_FRAMES; f++) {
    const table = new Float32Array(tableSize + 1);
    const t = f / (NUM_FRAMES - 1); // 0..1

    for (let h = 1; h <= numH; h++) {
      const sine = h === 1 ? 1 : 0;
      const tri = h % 2 === 1 ? (((h - 1) / 2) % 2 === 0 ? 1 : -1) / (h * h) : 0;
      const sq = h % 2 === 1 ? 1 / h : 0;
      const saw = 1 / h;

      let amp: number;
      if (t < 1 / 3) {
        const blend = t * 3;
        amp = sine * (1 - blend) + tri * blend;
      } else if (t < 2 / 3) {
        const blend = (t - 1 / 3) * 3;
        amp = tri * (1 - blend) + sq * blend;
      } else {
        const blend = (t - 2 / 3) * 3;
        amp = sq * (1 - blend) + saw * blend;
      }

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
