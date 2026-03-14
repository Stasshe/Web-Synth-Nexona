import type { Wavetable } from "../wavetableTypes";
import { NUM_FRAMES, normalize } from "../wavetableCommon";

export function generateMetallic(tableSize: number): Wavetable {
  const frames: Float32Array[] = [];
  const twoPi = 2 * Math.PI;
  // Inharmonic ratios inspired by bell/gong partials
  const partials = [1, 1.56, 2.0, 2.56, 3.01, 3.76, 4.07, 4.68, 5.24, 6.17, 7.08, 8.21];

  for (let f = 0; f < NUM_FRAMES; f++) {
    const table = new Float32Array(tableSize + 1);
    const t = f / (NUM_FRAMES - 1);

    for (let i = 0; i < tableSize; i++) {
      const phase = (twoPi * i) / tableSize;
      let s = 0;
      for (let p = 0; p < partials.length; p++) {
        // More partials become audible as frame increases
        const fadeIn = Math.max(0, Math.min(1, (t * partials.length - p + 2) / 2));
        const decay = 1 / (1 + p * 0.3);
        s += Math.sin(partials[p] * phase) * decay * fadeIn;
      }
      table[i] = s;
    }
    normalize(table, tableSize);
    table[tableSize] = table[0];
    frames.push(table);
  }
  return { frames, tableSize, numFrames: NUM_FRAMES };
}
