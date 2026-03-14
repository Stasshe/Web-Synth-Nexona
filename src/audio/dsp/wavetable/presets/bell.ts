import type { Wavetable } from "../wavetableTypes";
import { NUM_FRAMES, normalize } from "../wavetableCommon";

export function generateBell(tableSize: number): Wavetable {
  const frames: Float32Array[] = [];
  const twoPi = 2 * Math.PI;
  // Tubular bell partial ratios
  const partials = [1, 2.76, 5.4, 8.93, 13.34, 18.64, 24.84, 31.93];
  const amplitudes = [1, 0.8, 0.6, 0.45, 0.3, 0.2, 0.12, 0.07];

  for (let f = 0; f < NUM_FRAMES; f++) {
    const table = new Float32Array(tableSize + 1);
    const t = f / (NUM_FRAMES - 1);

    for (let i = 0; i < tableSize; i++) {
      const phase = (twoPi * i) / tableSize;
      let s = 0;
      for (let p = 0; p < partials.length; p++) {
        // Higher partials decay more with frame position (simulates bell decay)
        const decay = Math.exp(-p * t * 2);
        s += Math.sin(partials[p] * phase) * amplitudes[p] * decay;
      }
      table[i] = s;
    }
    normalize(table, tableSize);
    table[tableSize] = table[0];
    frames.push(table);
  }
  return { frames, tableSize, numFrames: NUM_FRAMES };
}
