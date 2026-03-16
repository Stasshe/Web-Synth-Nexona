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

  // 音声学的に正確な母音formant（Peterson & Barney 1952 + IPA基準）
  // [freq, bandwidth, gain] × 4formants
  // FormantはChoirより「くっきり・教科書的」に設計
  const vowels = [
    {
      name: "aa", // "father"の"a" - 最も開いた母音
      formants: [
        [800,  80,  1.00],
        [1200, 120, 0.70],
        [2500, 160, 0.18],
        [3500, 200, 0.05],
      ],
    },
    {
      name: "ae", // "cat"の"æ"
      formants: [
        [660,  75,  1.00],
        [1720, 130, 0.72],
        [2410, 160, 0.20],
        [3300, 200, 0.06],
      ],
    },
    {
      name: "eh", // "bed"の"e"
      formants: [
        [530,  70,  1.00],
        [1840, 140, 0.68],
        [2480, 170, 0.17],
        [3200, 210, 0.05],
      ],
    },
    {
      name: "ee", // "feet"の"i" - F1低・F2高が特徴
      formants: [
        [270,  60,  1.00],
        [2290, 150, 0.55],
        [3010, 180, 0.15],
        [3600, 220, 0.04],
      ],
    },
    {
      name: "oo", // "boot"の"u" - 両formantが低い
      formants: [
        [300,  65,  1.00],
        [870,  110, 0.35],
        [2240, 160, 0.10],
        [3200, 200, 0.03],
      ],
    },
    {
      name: "oh", // "boat"の"o"
      formants: [
        [570,  75,  1.00],
        [840,  110, 0.40],
        [2410, 165, 0.11],
        [3400, 210, 0.03],
      ],
    },
  ];

  // C4基準：formantピークの倍音解像度を確保
  const baseFreq = 261.63;

  for (let f = 0; f < NUM_FRAMES; f++) {
    const table = new Float32Array(tableSize + 1);
    const t = f / (NUM_FRAMES - 1);

    // Formantは線形補間のまま（モーフィングの軌跡を明示的に）
    const vowelPos = t * (vowels.length - 1);
    const vIdx = Math.min(Math.floor(vowelPos), vowels.length - 2);
    const vFrac = vowelPos - vIdx;

    const blendedFormants = vowels[vIdx].formants.map((fa, i) => {
      const fb = vowels[vIdx + 1].formants[i];
      return [
        fa[0] * (1 - vFrac) + fb[0] * vFrac,
        fa[1] * (1 - vFrac) + fb[1] * vFrac,
        fa[2] * (1 - vFrac) + fb[2] * vFrac,
      ];
    });

    for (let h = 1; h <= numH; h++) {
      const hFreq = h * baseFreq;

      let amp = 0;
      for (const [fFreq, bw, gain] of blendedFormants) {
        const diff = hFreq - fFreq;
        amp += gain * Math.exp(-(diff * diff) / (2 * bw * bw));
      }

      // Formantは1/h^1.2：ピーク形状を保ちつつ最低限の傾斜
      // Choirより浅い→formantピークがより際立って聞こえる
      amp /= Math.pow(h, 1.2);

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