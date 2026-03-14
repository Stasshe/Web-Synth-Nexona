import type { Wavetable } from "../wavetableTypes";
import { NUM_FRAMES, MAX_HARMONICS, buildSineLookup, normalize } from "../wavetableCommon";

export function generateNoiseShape(tableSize: number): Wavetable {
  const sineLut = buildSineLookup(tableSize);
  const frames: Float32Array[] = [];

  // Use seeded random for deterministic output
  let seed = 42;
  function nextRand(): number {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  }

  // Pre-generate random amplitudes and phases for harmonics
  const randAmps = new Float32Array(MAX_HARMONICS + 1);
  const randPhases = new Float32Array(MAX_HARMONICS + 1);
  for (let h = 1; h <= MAX_HARMONICS; h++) {
    randAmps[h] = nextRand();
    randPhases[h] = nextRand() * tableSize;
  }

  for (let f = 0; f < NUM_FRAMES; f++) {
    const table = new Float32Array(tableSize + 1);
    const t = f / (NUM_FRAMES - 1);
    // Cutoff moves up with frame position
    const cutoff = 2 + t * (MAX_HARMONICS - 2);

    for (let h = 1; h <= MAX_HARMONICS; h++) {
      // Low-pass shaped noise
      const lpGain = h < cutoff ? 1 : Math.exp(-(h - cutoff) * 0.5);
      const amp = (randAmps[h] * lpGain) / Math.sqrt(h);
      if (amp > 1e-8) {
        // Use random phase offset
        const phaseOff = Math.floor(randPhases[h]);
        for (let i = 0; i <= tableSize; i++) {
          table[i] += amp *
            sineLut[(((i * h + phaseOff) % tableSize) + tableSize) % tableSize];
        }
      }
    }
    normalize(table, tableSize);
    table[tableSize] = table[0];
    frames.push(table);
  }
  return { frames, tableSize, numFrames: NUM_FRAMES };
}
