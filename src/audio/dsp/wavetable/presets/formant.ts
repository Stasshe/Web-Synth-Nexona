import type { Wavetable } from "../wavetableTypes";
import {
  NUM_FRAMES,
  MAX_HARMONICS,
  buildSineLookup,
  normalize,
  addHarmonic,
} from "../wavetableCommon";

export function generateFormant(tableSize: number): Wavetable {
  const sineLut = buildSineLookup(tableSize);
  const frames: Float32Array[] = [];
  const numH = MAX_HARMONICS;

  // Formant frequencies (F1, F2, F3) with wider bandwidth for visible difference
  const vowels = [
    [730, 1090, 2440], // "ah"
    [270, 2290, 3010], // "ee"
    [300, 870, 2240], // "oo"
    [660, 1720, 2410], // "eh"
  ];
  const bw = [130, 180, 250]; // wider bandwidth
  const baseFreq = 130.81; // C3

  for (let f = 0; f < NUM_FRAMES; f++) {
    const table = new Float32Array(tableSize + 1);
    const t = f / (NUM_FRAMES - 1);

    const vowelPos = t * (vowels.length - 1);
    const vIdx = Math.min(Math.floor(vowelPos), vowels.length - 2);
    const vFrac = vowelPos - vIdx;
    const formants = [
      vowels[vIdx][0] * (1 - vFrac) + vowels[vIdx + 1][0] * vFrac,
      vowels[vIdx][1] * (1 - vFrac) + vowels[vIdx + 1][1] * vFrac,
      vowels[vIdx][2] * (1 - vFrac) + vowels[vIdx + 1][2] * vFrac,
    ];

    for (let h = 1; h <= numH; h++) {
      const hFreq = h * baseFreq;
      let amp = 0;
      for (let fi = 0; fi < 3; fi++) {
        const diff = hFreq - formants[fi];
        amp += Math.exp(-(diff * diff) / (2 * bw[fi] * bw[fi]));
      }
      // Steep 1/h roll-off emphasises spectral shape changes
      amp /= Math.sqrt(h);
      if (amp > 1e-8) {
        addHarmonic(table, sineLut, tableSize, h, amp);
      }
    }
    normalize(table, tableSize);
    table[tableSize] = table[0];
    frames.push(table);
  }

  return { frames, tableSize, numFrames: NUM_FRAMES };
}
