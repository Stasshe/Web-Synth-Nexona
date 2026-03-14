import type { Wavetable } from "../wavetableTypes";
import { NUM_FRAMES, MAX_HARMONICS, buildSineLookup, normalize, addHarmonic, addCosHarmonic } from "../wavetableCommon";

export function generateChoir(tableSize: number): Wavetable {
  const sineLut = buildSineLookup(tableSize);
  const frames: Float32Array[] = [];
  const numH = MAX_HARMONICS;

  // Multiple "singer" formant positions that blend across frames
  const singers = [
    { f1: 600, f2: 1000, f3: 2600 }, // dark "oh"
    { f1: 400, f2: 1600, f3: 2700 }, // mid "eh"
    { f1: 300, f2: 2200, f3: 3000 }, // bright "ee"
    { f1: 700, f2: 1100, f3: 2500 }, // open "ah"
  ];
  const bw = [120, 180, 250];
  const baseFreq = 130.81;

  for (let f = 0; f < NUM_FRAMES; f++) {
    const table = new Float32Array(tableSize + 1);
    const t = f / (NUM_FRAMES - 1);

    // Blend through singers
    const singerPos = t * (singers.length - 1);
    const sIdx = Math.min(Math.floor(singerPos), singers.length - 2);
    const sFrac = singerPos - sIdx;
    const f1 = singers[sIdx].f1 * (1 - sFrac) + singers[sIdx + 1].f1 * sFrac;
    const f2 = singers[sIdx].f2 * (1 - sFrac) + singers[sIdx + 1].f2 * sFrac;
    const f3 = singers[sIdx].f3 * (1 - sFrac) + singers[sIdx + 1].f3 * sFrac;
    const formants = [f1, f2, f3];

    for (let h = 1; h <= numH; h++) {
      const hFreq = h * baseFreq;
      let amp = 0;
      for (let fi = 0; fi < 3; fi++) {
        const diff = hFreq - formants[fi];
        amp += Math.exp(-(diff * diff) / (2 * bw[fi] * bw[fi]));
      }
      // Gentle roll-off for warm choir sound
      amp /= h;
      // Add slight "chorus" by mixing sin+cos
      if (amp > 1e-8) {
        addHarmonic(table, sineLut, tableSize, h, amp * 0.85);
        addCosHarmonic(table, sineLut, tableSize, h, amp * 0.15);
      }
    }
    normalize(table, tableSize);
    table[tableSize] = table[0];
    frames.push(table);
  }
  return { frames, tableSize, numFrames: NUM_FRAMES };
}
