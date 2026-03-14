import type { Wavetable } from "../wavetableTypes";
import {
  NUM_FRAMES,
  MAX_HARMONICS,
  buildSineLookup,
  normalize,
  addHarmonic,
} from "../wavetableCommon";

export function generateAdditive(tableSize: number): Wavetable {
  const sineLut = buildSineLookup(tableSize);
  const frames: Float32Array[] = [];
  const numH = MAX_HARMONICS;

  for (let f = 0; f < NUM_FRAMES; f++) {
    const table = new Float32Array(tableSize + 1);
    const t = f / (NUM_FRAMES - 1);

    for (let h = 1; h <= numH; h++) {
      let amp: number;
      if (t < 0.2) {
        // Fundamental only → add odd harmonics (sine to square character)
        const blend = t * 5;
        amp = h === 1 ? 1 : h % 2 === 1 ? blend / h : 0;
      } else if (t < 0.4) {
        // Odd harmonics → all harmonics (square to saw)
        const blend = (t - 0.2) * 5;
        amp = h % 2 === 1 ? 1 / h : (blend * 0.8) / h;
      } else if (t < 0.6) {
        // Saw → every 3rd harmonic (hollow / clarinet-like)
        const blend = (t - 0.4) * 5;
        const isSaw = 1 / h;
        const isThird = h % 3 === 1 ? 1 / h : 0;
        amp = isSaw * (1 - blend) + isThird * blend;
      } else if (t < 0.8) {
        // Every 3rd → reverse sawtooth (bright → dark)
        const blend = (t - 0.6) * 5;
        const isThird = h % 3 === 1 ? 1 / h : 0;
        const revSaw = 1 / (numH - h + 1);
        amp = isThird * (1 - blend) + revSaw * blend * 0.5;
      } else {
        // Reverse saw → dense buzzy (all harmonics equal-ish)
        const blend = (t - 0.8) * 5;
        const revSaw = 1 / (numH - h + 1);
        const buzz = 1 / Math.sqrt(h);
        amp = revSaw * 0.5 * (1 - blend) + buzz * blend;
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
