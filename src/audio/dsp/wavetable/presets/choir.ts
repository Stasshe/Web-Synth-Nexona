import type { Wavetable } from "../wavetableTypes";
import {
  NUM_FRAMES,
  MAX_HARMONICS,
  buildSineLookup,
  normalize,
  addHarmonic,
  addCosHarmonic,
} from "../wavetableCommon";

export function generateChoir(tableSize: number): Wavetable {
  const sineLut = buildSineLookup(tableSize);
  const frames: Float32Array[] = [];
  const numH = MAX_HARMONICS;

  // より正確な母音formant値（音声学的根拠あり）
  // 各formantに個別BW・ゲインを持たせる
  // [freq, bandwidth, gain]
  const singers = [
    {
      // "ah" - open vowel, warm foundation
      formants: [
        [800, 100, 1.00],
        [1200, 150, 0.55],
        [2500, 200, 0.12],
        [3500, 250, 0.04],
      ],
    },
    {
      // "oh" - rounded, dark
      formants: [
        [500, 80,  1.00],
        [900, 120, 0.45],
        [2600, 200, 0.10],
        [3400, 250, 0.03],
      ],
    },
    {
      // "oo" - darkest, very rounded
      formants: [
        [320, 70,  1.00],
        [700, 100, 0.30],
        [2300, 180, 0.08],
        [3200, 240, 0.02],
      ],
    },
    {
      // "eh" - mid-bright
      formants: [
        [500, 90,  1.00],
        [1700, 160, 0.60],
        [2500, 200, 0.14],
        [3500, 260, 0.05],
      ],
    },
    {
      // "ee" - brightest（最後だが強調を抑える）
      formants: [
        [300, 65,  1.00],
        [2200, 180, 0.50],
        [3000, 220, 0.13],
        [3600, 270, 0.04],
      ],
    },
  ];

  // 基本周波数：C4（261.63Hz）でformant解像度を確保
  const baseFreq = 261.63;

  for (let f = 0; f < NUM_FRAMES; f++) {
    const table = new Float32Array(tableSize + 1);
    const t = f / (NUM_FRAMES - 1);

    // 非線形モーフィング：中間でスピードが落ちる（声の移行に近い）
    const tCurved = t < 0.5
      ? 2 * t * t
      : 1 - Math.pow(-2 * t + 2, 2) / 2;

    const singerPos = tCurved * (singers.length - 1);
    const sIdx = Math.min(Math.floor(singerPos), singers.length - 2);
    const sFrac = singerPos - sIdx;

    // formant補間
    const blendedFormants = singers[sIdx].formants.map((fa, i) => {
      const fb = singers[sIdx + 1].formants[i];
      return [
        fa[0] * (1 - sFrac) + fb[0] * sFrac, // freq
        fa[1] * (1 - sFrac) + fb[1] * sFrac, // bw
        fa[2] * (1 - sFrac) + fb[2] * sFrac, // gain
      ];
    });

    for (let h = 1; h <= numH; h++) {
      const hFreq = h * baseFreq;

      // formantフィルタリング
      let amp = 0;
      for (const [fFreq, bw, gain] of blendedFormants) {
        const diff = hFreq - fFreq;
        amp += gain * Math.exp(-(diff * diff) / (2 * bw * bw));
      }

      // スペクトル傾斜：1/h^1.8（合唱らしい暖かさ、鋸波より急、純正弦より緩）
      amp /= Math.pow(h, 1.8);

      if (amp > 1e-8) {
        // cos混合：低次倍音だけに適用（位相多様性 = 広がり感）
        // 高次に適用すると不自然なざらつきになる
        const cosRatio = h <= 4 ? 0.12 : 0.0;
        addHarmonic(table, sineLut, tableSize, h, amp * (1 - cosRatio));
        if (cosRatio > 0) {
          addCosHarmonic(table, sineLut, tableSize, h, amp * cosRatio);
        }
      }
    }

    normalize(table, tableSize);
    table[tableSize] = table[0];
    frames.push(table);
  }

  return { frames, tableSize, numFrames: NUM_FRAMES };
}