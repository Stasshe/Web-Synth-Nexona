import type { Wavetable } from "../wavetableTypes";
import { NUM_FRAMES, buildSineLookup, normalize, addHarmonic } from "../wavetableCommon";

export function generateWarmPad(tableSize: number): Wavetable {
  const sineLut = buildSineLookup(tableSize);
  const frames: Float32Array[] = [];
  const numH = 48;

  for (let f = 0; f < NUM_FRAMES; f++) {
    const table = new Float32Array(tableSize + 1);
    const t = f / (NUM_FRAMES - 1);

    for (let h = 1; h <= numH; h++) {
      // Gaussian spectral envelope that shifts up with frame
      const center = 1 + t * 12;
      const width = 3 + t * 8;
      const diff = h - center;
      const envelope = Math.exp(-(diff * diff) / (2 * width * width));
      const amp = envelope / Math.sqrt(h);
      if (amp > 1e-8) {
        addHarmonic(table, sineLut, tableSize, h, amp);
        // Add slightly detuned copy for warmth
        if (h > 1 && h < numH) {
          const detuneAmt = 0.002 * t;
          for (let i = 0; i <= tableSize; i++) {
            const detunePhase = (i * (h + detuneAmt)) % tableSize;
            const idx = Math.floor(detunePhase) % tableSize;
            table[i] += amp * 0.3 * sineLut[idx];
          }
        }
      }
    }
    normalize(table, tableSize);
    table[tableSize] = table[0];
    frames.push(table);
  }
  return { frames, tableSize, numFrames: NUM_FRAMES };
}
