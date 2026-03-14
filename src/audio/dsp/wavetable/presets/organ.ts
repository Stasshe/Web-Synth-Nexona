import type { Wavetable } from "../wavetableTypes";
import { NUM_FRAMES, buildSineLookup, normalize, addHarmonic, addCosHarmonic } from "../wavetableCommon";

export function generateOrgan(tableSize: number): Wavetable {
  const sineLut = buildSineLookup(tableSize);
  const frames: Float32Array[] = [];

  const drawbarHarmonics = [1, 2, 3, 4, 5, 6, 8];

  for (let f = 0; f < NUM_FRAMES; f++) {
    const table = new Float32Array(tableSize + 1);
    const t = f / (NUM_FRAMES - 1);

    for (let d = 0; d < drawbarHarmonics.length; d++) {
      const h = drawbarHarmonics[d];
      const fadeStart = d / drawbarHarmonics.length;
      const fadeEnd = fadeStart + 0.3;
      let level: number;
      if (t < fadeStart) {
        level = 0;
      } else if (t < fadeEnd) {
        level = (t - fadeStart) / (fadeEnd - fadeStart);
      } else {
        level = 1;
      }
      if (level > 0) {
        addHarmonic(table, sineLut, tableSize, h, level * 0.8);
        addCosHarmonic(table, sineLut, tableSize, h, level * 0.1);
      }
    }
    normalize(table, tableSize);
    table[tableSize] = table[0];
    frames.push(table);
  }
  return { frames, tableSize, numFrames: NUM_FRAMES };
}
