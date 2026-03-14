import type { Wavetable } from "../wavetableTypes";
import { NUM_FRAMES, buildSineLookup, normalize } from "../wavetableCommon";

export function generateDigital(tableSize: number): Wavetable {
  const frames: Float32Array[] = [];
  const twoPi = 2 * Math.PI;

  const ratios = [1, 2, 3, 1.5, 2.5, 3.5, 4, 5];

  for (let f = 0; f < NUM_FRAMES; f++) {
    const table = new Float32Array(tableSize + 1);
    const t = f / (NUM_FRAMES - 1);

    const ratioIdx = t * (ratios.length - 1);
    const rIdx = Math.min(Math.floor(ratioIdx), ratios.length - 2);
    const rFrac = ratioIdx - rIdx;
    const ratio = ratios[rIdx] * (1 - rFrac) + ratios[rIdx + 1] * rFrac;

    const modIndex = 0.5 + t * 4;

    for (let i = 0; i < tableSize; i++) {
      const phase = (twoPi * i) / tableSize;
      table[i] = Math.sin(phase + modIndex * Math.sin(ratio * phase));
    }
    normalize(table, tableSize);
    table[tableSize] = table[0];
    frames.push(table);
  }
  return { frames, tableSize, numFrames: NUM_FRAMES };
}
