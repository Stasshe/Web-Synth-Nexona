import type { Wavetable } from "../wavetableTypes";
import {
  NUM_FRAMES,
  MAX_HARMONICS,
  buildSineLookup,
  normalize,
  addHarmonic,
} from "../wavetableCommon";

export function generateVowel(tableSize: number): Wavetable {
  const sineLut = buildSineLookup(tableSize);
  const frames: Float32Array[] = [];
  const numH = MAX_HARMONICS;

  // F1-F2空間上で連続するパスに並べ替え
  // U→O→A→E→I：暗→明、閉→開→前舌の自然な軌跡
  // 各formant: [freq, bandwidth, gain]
  const vowels = [
    {
      name: "U", // "boot" - 暗・丸・閉
      formants: [
        [310,  60,  1.00],
        [870,  90,  0.32],
        [2240, 140, 0.08],
        [3200, 180, 0.02],
      ],
    },
    {
      name: "O", // "boat" - 丸・中程度
      formants: [
        [570,  70,  1.00],
        [840,  100, 0.38],
        [2410, 150, 0.10],
        [3300, 185, 0.03],
      ],
    },
    {
      name: "A", // "father" - 最大開口・明るい
      formants: [
        [800,  85,  1.00],
        [1200, 110, 0.65],
        [2600, 160, 0.15],
        [3500, 200, 0.04],
      ],
    },
    {
      name: "E", // "bed" - 前舌・中高
      formants: [
        [530,  75,  1.00],
        [1840, 130, 0.68],
        [2480, 155, 0.16],
        [3300, 195, 0.05],
      ],
    },
    {
      name: "I", // "feet" - 前舌・高・最も明るい
      formants: [
        [270,  55,  1.00],
        [2290, 145, 0.52],
        [3010, 170, 0.13],
        [3600, 210, 0.04],
      ],
    },
  ];

  const baseFreq = 261.63; // C4

  for (let f = 0; f < NUM_FRAMES; f++) {
    const table = new Float32Array(tableSize + 1);
    const t = f / (NUM_FRAMES - 1);

    // Vowelはほぼ線形だが両端だけ少し緩める
    // （各母音の「中心」で安定して聞こえるように）
    const tEased = t + 0.08 * Math.sin(2 * Math.PI * t * (vowels.length - 1) / (vowels.length - 1));
    const tClamped = Math.max(0, Math.min(1, tEased));

    const vowelPos = tClamped * (vowels.length - 1);
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

      // Vowelは1/h^1.5：Choirより明るく、Formantより丸い
      // 各母音の「らしさ」を保ちつつ耳に刺さらない中間点
      amp /= Math.pow(h, 1.5);

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