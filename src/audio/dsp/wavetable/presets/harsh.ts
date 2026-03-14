import type { Wavetable } from "../wavetableTypes";
import { NUM_FRAMES, normalize } from "../wavetableCommon";

export function generateHarsh(tableSize: number): Wavetable {
  const frames: Float32Array[] = [];
  const twoPi = 2 * Math.PI;

  for (let f = 0; f < NUM_FRAMES; f++) {
    const table = new Float32Array(tableSize + 1);
    const t = f / (NUM_FRAMES - 1);

    for (let i = 0; i < tableSize; i++) {
      const phase = (twoPi * i) / tableSize;
      // Start with a mild sine, progressively clip and add harmonics
      let s = Math.sin(phase);
      // Add progressively harsh overtones
      const numOvertones = 2 + Math.floor(t * 30);
      for (let h = 2; h <= numOvertones; h++) {
        const evenBoost = h % 2 === 0 ? 1.5 : 1;
        s += (Math.sin(h * phase) * evenBoost) / h ** (0.5 + (1 - t) * 0.8);
      }
      // Soft clipping that intensifies with frame position
      const clipAmount = 1 + t * 4;
      s = Math.tanh(s * clipAmount);
      table[i] = s;
    }
    normalize(table, tableSize);
    table[tableSize] = table[0];
    frames.push(table);
  }
  return { frames, tableSize, numFrames: NUM_FRAMES };
}
