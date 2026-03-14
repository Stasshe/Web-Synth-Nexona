import type { Wavetable } from "../wavetableTypes";
import { NUM_FRAMES } from "../wavetableCommon";

export function generateSyncSweep(tableSize: number): Wavetable {
  const frames: Float32Array[] = [];
  const twoPi = 2 * Math.PI;

  for (let f = 0; f < NUM_FRAMES; f++) {
    const table = new Float32Array(tableSize + 1);
    // Slave ratio from 1x to 8x
    const ratio = 1 + (f / (NUM_FRAMES - 1)) * 7;

    for (let i = 0; i < tableSize; i++) {
      const masterPhase = i / tableSize;
      // Slave oscillator resets each master cycle
      const slavePhase = (masterPhase * ratio) % 1;
      table[i] = Math.sin(twoPi * slavePhase);
    }
    // Normalize is not required for a sine wave, but we keep parity with other presets
    table[tableSize] = table[0];
    frames.push(table);
  }
  return { frames, tableSize, numFrames: NUM_FRAMES };
}
