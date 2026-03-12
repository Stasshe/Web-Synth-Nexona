import type { Wavetable } from "./wavetableEngine";

const NUM_FRAMES = 64;
const MAX_HARMONICS = 128;
const MIN_HARMONICS = 32;

export enum WavetablePreset {
  SINE = 0,
  SAW = 1,
  SQUARE = 2,
  TRIANGLE = 3,
  INIT = 4,
  BASIC_SHAPES = 5,
  PWM = 6,
  FORMANT = 7,
  ADDITIVE = 8,
  DIGITAL = 9,
  PLUCK = 10,
  ORGAN = 11,
}

export const PRESET_NAMES: Record<number, string> = {
  [WavetablePreset.SINE]: "Sine",
  [WavetablePreset.SAW]: "Saw",
  [WavetablePreset.SQUARE]: "Square",
  [WavetablePreset.TRIANGLE]: "Triangle",
  [WavetablePreset.INIT]: "Init",
  [WavetablePreset.BASIC_SHAPES]: "Basic Shapes",
  [WavetablePreset.PWM]: "PWM",
  [WavetablePreset.FORMANT]: "Formant",
  [WavetablePreset.ADDITIVE]: "Additive",
  [WavetablePreset.DIGITAL]: "Digital",
  [WavetablePreset.PLUCK]: "Pluck",
  [WavetablePreset.ORGAN]: "Organ",
};

export const PRESET_COUNT = Object.keys(PRESET_NAMES).length;

function buildSineLookup(tableSize: number): Float32Array {
  const lut = new Float32Array(tableSize);
  const twoPiOverN = (2 * Math.PI) / tableSize;
  for (let i = 0; i < tableSize; i++) {
    lut[i] = Math.sin(i * twoPiOverN);
  }
  return lut;
}

function normalize(data: Float32Array, size: number): void {
  let max = 0;
  for (let i = 0; i < size; i++) {
    const a = Math.abs(data[i]);
    if (a > max) max = a;
  }
  if (max > 0) {
    for (let i = 0; i <= size; i++) {
      data[i] /= max;
    }
  }
}

function addHarmonic(
  table: Float32Array,
  sineLut: Float32Array,
  tableSize: number,
  harmonic: number,
  amp: number,
): void {
  for (let i = 0; i <= tableSize; i++) {
    table[i] += amp * sineLut[(i * harmonic) % tableSize];
  }
}

function addCosHarmonic(
  table: Float32Array,
  sineLut: Float32Array,
  tableSize: number,
  harmonic: number,
  amp: number,
): void {
  const quarterPhase = Math.floor(tableSize / 4);
  for (let i = 0; i <= tableSize; i++) {
    table[i] += amp * sineLut[((i * harmonic + quarterPhase) % tableSize + tableSize) % tableSize];
  }
}

/** Init: clean saw with increasing bandwidth across frames */
function generateInit(tableSize: number): Wavetable {
  const sineLut = buildSineLookup(tableSize);
  const frames: Float32Array[] = [];
  for (let f = 0; f < NUM_FRAMES; f++) {
    const table = new Float32Array(tableSize + 1);
    const numH = MIN_HARMONICS + Math.floor((f / (NUM_FRAMES - 1)) * (MAX_HARMONICS - MIN_HARMONICS));
    for (let h = 1; h <= numH; h++) {
      addHarmonic(table, sineLut, tableSize, h, 1 / h);
    }
    normalize(table, tableSize);
    table[tableSize] = table[0];
    frames.push(table);
  }
  return { frames, tableSize, numFrames: NUM_FRAMES };
}

/** Basic Shapes: morphs sine→triangle→square→saw across 64 frames */
function generateBasicShapes(tableSize: number): Wavetable {
  const sineLut = buildSineLookup(tableSize);
  const frames: Float32Array[] = [];
  const numH = 64;

  for (let f = 0; f < NUM_FRAMES; f++) {
    const table = new Float32Array(tableSize + 1);
    const t = f / (NUM_FRAMES - 1); // 0..1

    for (let h = 1; h <= numH; h++) {
      // Sine coefficients: h=1 only
      const sine = h === 1 ? 1 : 0;
      // Triangle coefficients: odd harmonics, alternating sign, 1/h^2
      const tri = h % 2 === 1 ? (((h - 1) / 2) % 2 === 0 ? 1 : -1) / (h * h) : 0;
      // Square coefficients: odd harmonics, 1/h
      const sq = h % 2 === 1 ? 1 / h : 0;
      // Saw coefficients: all harmonics, 1/h
      const saw = 1 / h;

      // Crossfade between shapes at 4 zones
      let amp: number;
      if (t < 1 / 3) {
        const blend = t * 3;
        amp = sine * (1 - blend) + tri * blend;
      } else if (t < 2 / 3) {
        const blend = (t - 1 / 3) * 3;
        amp = tri * (1 - blend) + sq * blend;
      } else {
        const blend = (t - 2 / 3) * 3;
        amp = sq * (1 - blend) + saw * blend;
      }

      if (Math.abs(amp) > 1e-8) {
        addHarmonic(table, sineLut, tableSize, h, amp);
      }
    }
    normalize(table, tableSize);
    table[tableSize] = table[0];
    frames.push(table);
  }
  return { frames, tableSize, numFrames: NUM_FRAMES };
}

/** PWM: pulse width modulation sweep from narrow to wide pulse */
function generatePWM(tableSize: number): Wavetable {
  const sineLut = buildSineLookup(tableSize);
  const frames: Float32Array[] = [];
  const numH = 64;

  for (let f = 0; f < NUM_FRAMES; f++) {
    const table = new Float32Array(tableSize + 1);
    // Duty cycle from 5% to 95%
    const width = 0.05 + (f / (NUM_FRAMES - 1)) * 0.9;

    for (let h = 1; h <= numH; h++) {
      // Fourier series of a pulse wave with given duty cycle
      const amp = (2 / (h * Math.PI)) * Math.sin(h * Math.PI * width);
      if (Math.abs(amp) > 1e-8) {
        addHarmonic(table, sineLut, tableSize, h, amp);
      }
    }
    normalize(table, tableSize);
    table[tableSize] = table[0];
    frames.push(table);
  }
  return { frames, tableSize, numFrames: NUM_FRAMES };
}

/** Formant: vowel-like formant sweep through ah→ee→oo→eh */
function generateFormant(tableSize: number): Wavetable {
  const sineLut = buildSineLookup(tableSize);
  const frames: Float32Array[] = [];
  const numH = 64;

  // Formant frequencies in Hz for 4 vowels (F1, F2, F3)
  const vowels = [
    [730, 1090, 2440],  // "ah"
    [270, 2290, 3010],  // "ee"
    [300, 870, 2240],   // "oo"
    [660, 1720, 2410],  // "eh"
  ];
  // Bandwidth for each formant (Hz)
  const bw = [80, 120, 160];

  const baseFreq = 130.81; // C3 as reference fundamental

  for (let f = 0; f < NUM_FRAMES; f++) {
    const table = new Float32Array(tableSize + 1);
    const t = f / (NUM_FRAMES - 1);

    // Interpolate between vowels
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
      // Sum Gaussian peaks at each formant frequency
      for (let fi = 0; fi < 3; fi++) {
        const diff = hFreq - formants[fi];
        amp += Math.exp(-(diff * diff) / (2 * bw[fi] * bw[fi]));
      }
      amp /= h; // Roll off with harmonic number
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

/** Additive: harmonic series variations from fundamental to full harmonics */
function generateAdditive(tableSize: number): Wavetable {
  const sineLut = buildSineLookup(tableSize);
  const frames: Float32Array[] = [];
  const numH = 64;

  for (let f = 0; f < NUM_FRAMES; f++) {
    const table = new Float32Array(tableSize + 1);
    const t = f / (NUM_FRAMES - 1);

    for (let h = 1; h <= numH; h++) {
      let amp: number;
      if (t < 0.25) {
        // Fundamental + odd harmonics gradually
        const blend = t * 4;
        amp = h === 1 ? 1 : h % 2 === 1 ? blend / (h * h) : 0;
      } else if (t < 0.5) {
        // Bell-like: inharmonic-ish, strong at h=1,4,7,10...
        const blend = (t - 0.25) * 4;
        const isBellH = (h - 1) % 3 === 0;
        amp = isBellH ? (1 / h) * (0.5 + 0.5 * blend) : (1 - blend) * (h % 2 === 1 ? 1 / (h * h) : 0);
      } else if (t < 0.75) {
        // Bright: all odd harmonics at equal amplitude, decaying evens
        const blend = (t - 0.5) * 4;
        amp = h % 2 === 1 ? 0.7 / Math.sqrt(h) : (blend * 0.3) / h;
      } else {
        // Full: all harmonics with exponential decay
        const blend = (t - 0.75) * 4;
        const decayRate = 2 - blend * 1.5; // steeper decay at start
        amp = Math.exp(-h / (numH / decayRate)) * (1 / Math.sqrt(h));
      }

      if (Math.abs(amp) > 1e-8) {
        addHarmonic(table, sineLut, tableSize, h, amp);
      }
    }
    normalize(table, tableSize);
    table[tableSize] = table[0];
    frames.push(table);
  }
  return { frames, tableSize, numFrames: NUM_FRAMES };
}

/** Digital: FM-derived metallic textures with varying modulation */
function generateDigital(tableSize: number): Wavetable {
  const frames: Float32Array[] = [];
  const twoPi = 2 * Math.PI;

  // Different FM ratios for variety
  const ratios = [1, 2, 3, 1.5, 2.5, 3.5, 4, 5];

  for (let f = 0; f < NUM_FRAMES; f++) {
    const table = new Float32Array(tableSize + 1);
    const t = f / (NUM_FRAMES - 1);

    // Select and blend FM ratios
    const ratioIdx = t * (ratios.length - 1);
    const rIdx = Math.min(Math.floor(ratioIdx), ratios.length - 2);
    const rFrac = ratioIdx - rIdx;
    const ratio = ratios[rIdx] * (1 - rFrac) + ratios[rIdx + 1] * rFrac;

    // Modulation index increases across frames
    const modIndex = 0.5 + t * 4;

    for (let i = 0; i < tableSize; i++) {
      const phase = (twoPi * i) / tableSize;
      table[i] = Math.sin(phase + modIndex * Math.sin(ratio * phase));
    }
    normalize(table, tableSize);
    table[tableSize] = table[0];
    frames.push(table);
  }
  return { frames, tableSize, numFrames: NUM_FRAMES };
}

/** Pluck: simulates harmonic decay of a plucked string */
function generatePluck(tableSize: number): Wavetable {
  const sineLut = buildSineLookup(tableSize);
  const frames: Float32Array[] = [];
  const numH = MAX_HARMONICS;

  for (let f = 0; f < NUM_FRAMES; f++) {
    const table = new Float32Array(tableSize + 1);
    const t = f / (NUM_FRAMES - 1);

    for (let h = 1; h <= numH; h++) {
      // Higher harmonics decay faster — mimics natural plucked string
      // Frame 0 = bright attack, Frame 63 = only fundamental remains
      const decay = Math.exp(-h * t * 4);
      const amp = decay / h;
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

/** Organ: drawbar registration combinations */
function generateOrgan(tableSize: number): Wavetable {
  const sineLut = buildSineLookup(tableSize);
  const frames: Float32Array[] = [];

  // Standard organ drawbar harmonic numbers: 16', 5-1/3', 8', 4', 2-2/3', 2', 1-3/5', 1-1/3', 1'
  // Relative to 8' fundamental: 0.5, 1.5, 1, 2, 3, 4, 5, 6, 8
  // We'll use integer harmonics: 1, 2, 3, 4, 5, 6, 8 (skipping sub-fundamental for simplicity)
  const drawbarHarmonics = [1, 2, 3, 4, 5, 6, 8];

  for (let f = 0; f < NUM_FRAMES; f++) {
    const table = new Float32Array(tableSize + 1);
    const t = f / (NUM_FRAMES - 1);

    // Gradually add drawbars across frames
    for (let d = 0; d < drawbarHarmonics.length; d++) {
      const h = drawbarHarmonics[d];
      // Each drawbar fades in at a different position
      const fadeStart = d / drawbarHarmonics.length;
      const fadeEnd = fadeStart + 0.3;
      let level: number;
      if (t < fadeStart) {
        level = 0;
      } else if (t < fadeEnd) {
        level = (t - fadeStart) / (fadeEnd - fadeStart);
      } else {
        level = 1;
      }
      // Organ pipes have roughly equal amplitude
      if (level > 0) {
        addHarmonic(table, sineLut, tableSize, h, level * 0.8);
        // Add a subtle cosine component for pipe character
        addCosHarmonic(table, sineLut, tableSize, h, level * 0.1);
      }
    }
    normalize(table, tableSize);
    table[tableSize] = table[0];
    frames.push(table);
  }
  return { frames, tableSize, numFrames: NUM_FRAMES };
}

export function generatePreset(preset: WavetablePreset, tableSize: number): Wavetable {
  switch (preset) {
    case WavetablePreset.INIT:
      return generateInit(tableSize);
    case WavetablePreset.BASIC_SHAPES:
      return generateBasicShapes(tableSize);
    case WavetablePreset.PWM:
      return generatePWM(tableSize);
    case WavetablePreset.FORMANT:
      return generateFormant(tableSize);
    case WavetablePreset.ADDITIVE:
      return generateAdditive(tableSize);
    case WavetablePreset.DIGITAL:
      return generateDigital(tableSize);
    case WavetablePreset.PLUCK:
      return generatePluck(tableSize);
    case WavetablePreset.ORGAN:
      return generateOrgan(tableSize);
    default:
      return generateInit(tableSize);
  }
}
