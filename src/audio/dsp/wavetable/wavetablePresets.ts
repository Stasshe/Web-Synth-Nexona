export interface Wavetable {
  frames: Float32Array[];
  tableSize: number;
  numFrames: number;
}

const NUM_FRAMES = 64;
const MAX_HARMONICS = 128;
const MIN_HARMONICS = 32;

export enum WavetablePreset {
  INIT = 0,
  BASIC_SHAPES = 1,
  PWM = 2,
  FORMANT = 3,
  ADDITIVE = 4,
  DIGITAL = 5,
  PLUCK = 6,
  ORGAN = 7,
  VOWEL = 8,
  METALLIC = 9,
  HARSH = 10,
  WARM_PAD = 11,
  SYNC_SWEEP = 12,
  NOISE_SHAPE = 13,
  BELL = 14,
  CHOIR = 15,
}

export const PRESET_NAMES: Record<number, string> = {
  [WavetablePreset.INIT]: "Init",
  [WavetablePreset.BASIC_SHAPES]: "Basic Shapes",
  [WavetablePreset.PWM]: "PWM",
  [WavetablePreset.FORMANT]: "Formant",
  [WavetablePreset.ADDITIVE]: "Additive",
  [WavetablePreset.DIGITAL]: "Digital",
  [WavetablePreset.PLUCK]: "Pluck",
  [WavetablePreset.ORGAN]: "Organ",
  [WavetablePreset.VOWEL]: "Vowel",
  [WavetablePreset.METALLIC]: "Metallic",
  [WavetablePreset.HARSH]: "Harsh",
  [WavetablePreset.WARM_PAD]: "Warm Pad",
  [WavetablePreset.SYNC_SWEEP]: "Sync Sweep",
  [WavetablePreset.NOISE_SHAPE]: "Noise Shape",
  [WavetablePreset.BELL]: "Bell",
  [WavetablePreset.CHOIR]: "Choir",
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
    table[i] +=
      amp * sineLut[(((i * harmonic + quarterPhase) % tableSize) + tableSize) % tableSize];
  }
}

/** Init: clean saw with increasing bandwidth across frames */
function generateInit(tableSize: number): Wavetable {
  const sineLut = buildSineLookup(tableSize);
  const frames: Float32Array[] = [];
  for (let f = 0; f < NUM_FRAMES; f++) {
    const table = new Float32Array(tableSize + 1);
    const numH =
      MIN_HARMONICS + Math.floor((f / (NUM_FRAMES - 1)) * (MAX_HARMONICS - MIN_HARMONICS));
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
      const sine = h === 1 ? 1 : 0;
      const tri = h % 2 === 1 ? (((h - 1) / 2) % 2 === 0 ? 1 : -1) / (h * h) : 0;
      const sq = h % 2 === 1 ? 1 / h : 0;
      const saw = 1 / h;

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
    const width = 0.05 + (f / (NUM_FRAMES - 1)) * 0.9;

    for (let h = 1; h <= numH; h++) {
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

/** Formant: vowel-like formant sweep through ah→ee→oo→eh with wider bandwidth and stronger peaks */
function generateFormant(tableSize: number): Wavetable {
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

/** Additive: distinct harmonic series variations with dramatic waveform shape changes */
function generateAdditive(tableSize: number): Wavetable {
  const sineLut = buildSineLookup(tableSize);
  const frames: Float32Array[] = [];
  const numH = MAX_HARMONICS;

  for (let f = 0; f < NUM_FRAMES; f++) {
    const table = new Float32Array(tableSize + 1);
    const t = f / (NUM_FRAMES - 1);

    for (let h = 1; h <= numH; h++) {
      let amp: number;
      if (t < 0.2) {
        // Fundamental only → add odd harmonics (sine to square character)
        const blend = t * 5;
        amp = h === 1 ? 1 : h % 2 === 1 ? blend / h : 0;
      } else if (t < 0.4) {
        // Odd harmonics → all harmonics (square to saw)
        const blend = (t - 0.2) * 5;
        amp = h % 2 === 1 ? 1 / h : (blend * 0.8) / h;
      } else if (t < 0.6) {
        // Saw → every 3rd harmonic (hollow / clarinet-like)
        const blend = (t - 0.4) * 5;
        const isSaw = 1 / h;
        const isThird = h % 3 === 1 ? 1 / h : 0;
        amp = isSaw * (1 - blend) + isThird * blend;
      } else if (t < 0.8) {
        // Every 3rd → reverse sawtooth (bright → dark)
        const blend = (t - 0.6) * 5;
        const isThird = h % 3 === 1 ? 1 / h : 0;
        const revSaw = 1 / (numH - h + 1);
        amp = isThird * (1 - blend) + revSaw * blend * 0.5;
      } else {
        // Reverse saw → dense buzzy (all harmonics equal-ish)
        const blend = (t - 0.8) * 5;
        const revSaw = 1 / (numH - h + 1);
        const buzz = 1 / Math.sqrt(h);
        amp = revSaw * 0.5 * (1 - blend) + buzz * blend;
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

  const ratios = [1, 2, 3, 1.5, 2.5, 3.5, 4, 5];

  for (let f = 0; f < NUM_FRAMES; f++) {
    const table = new Float32Array(tableSize + 1);
    const t = f / (NUM_FRAMES - 1);

    const ratioIdx = t * (ratios.length - 1);
    const rIdx = Math.min(Math.floor(ratioIdx), ratios.length - 2);
    const rFrac = ratioIdx - rIdx;
    const ratio = ratios[rIdx] * (1 - rFrac) + ratios[rIdx + 1] * rFrac;

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

  const drawbarHarmonics = [1, 2, 3, 4, 5, 6, 8];

  for (let f = 0; f < NUM_FRAMES; f++) {
    const table = new Float32Array(tableSize + 1);
    const t = f / (NUM_FRAMES - 1);

    for (let d = 0; d < drawbarHarmonics.length; d++) {
      const h = drawbarHarmonics[d];
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
      if (level > 0) {
        addHarmonic(table, sineLut, tableSize, h, level * 0.8);
        addCosHarmonic(table, sineLut, tableSize, h, level * 0.1);
      }
    }
    normalize(table, tableSize);
    table[tableSize] = table[0];
    frames.push(table);
  }
  return { frames, tableSize, numFrames: NUM_FRAMES };
}

/** Vowel: sweeps through 5 vowel sounds (A-E-I-O-U) with strong formant character */
function generateVowel(tableSize: number): Wavetable {
  const sineLut = buildSineLookup(tableSize);
  const frames: Float32Array[] = [];
  const numH = MAX_HARMONICS;

  // F1, F2, F3 for A E I O U
  const vowels = [
    [800, 1150, 2900], // A
    [400, 1600, 2700], // E
    [350, 2300, 3200], // I
    [450, 800, 2830], // O
    [325, 700, 2530], // U
  ];
  const bw = [100, 150, 200];
  const baseFreq = 130.81;

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

/** Metallic: inharmonic partials that create bell/gong-like timbres */
function generateMetallic(tableSize: number): Wavetable {
  const frames: Float32Array[] = [];
  const twoPi = 2 * Math.PI;
  // Inharmonic ratios inspired by bell/gong partials
  const partials = [1, 1.56, 2.0, 2.56, 3.01, 3.76, 4.07, 4.68, 5.24, 6.17, 7.08, 8.21];

  for (let f = 0; f < NUM_FRAMES; f++) {
    const table = new Float32Array(tableSize + 1);
    const t = f / (NUM_FRAMES - 1);

    for (let i = 0; i < tableSize; i++) {
      const phase = (twoPi * i) / tableSize;
      let s = 0;
      for (let p = 0; p < partials.length; p++) {
        // More partials become audible as frame increases
        const fadeIn = Math.max(0, Math.min(1, (t * partials.length - p + 2) / 2));
        const decay = 1 / (1 + p * 0.3);
        s += Math.sin(partials[p] * phase) * decay * fadeIn;
      }
      table[i] = s;
    }
    normalize(table, tableSize);
    table[tableSize] = table[0];
    frames.push(table);
  }
  return { frames, tableSize, numFrames: NUM_FRAMES };
}

/** Harsh: aggressive waveforms with strong even harmonics and clipping */
function generateHarsh(tableSize: number): Wavetable {
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

/** Warm Pad: soft, detuned unison-like textures with slow spectral evolution */
function generateWarmPad(tableSize: number): Wavetable {
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

/** Sync Sweep: hard sync simulation with sweeping slave frequency */
function generateSyncSweep(tableSize: number): Wavetable {
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
    normalize(table, tableSize);
    table[tableSize] = table[0];
    frames.push(table);
  }
  return { frames, tableSize, numFrames: NUM_FRAMES };
}

/** Noise Shape: filtered noise-like spectra from smooth to harsh */
function generateNoiseShape(tableSize: number): Wavetable {
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
          table[i] += amp * sineLut[(((i * h + phaseOff) % tableSize) + tableSize) % tableSize];
        }
      }
    }
    normalize(table, tableSize);
    table[tableSize] = table[0];
    frames.push(table);
  }
  return { frames, tableSize, numFrames: NUM_FRAMES };
}

/** Bell: tuned bell tones using inharmonic Bessel-like partial ratios */
function generateBell(tableSize: number): Wavetable {
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

/** Choir: layered formant-shaped harmonics simulating vocal ensemble */
function generateChoir(tableSize: number): Wavetable {
  const sineLut = buildSineLookup(tableSize);
  const frames: Float32Array[] = [];
  const numH = MAX_HARMONICS;

  // Multiple "singer" formant positions that blend across frames
  const singers = [
    { f1: 600, f2: 1000, f3: 2600 }, // dark "oh"
    { f1: 400, f2: 1600, f3: 2700 }, // mid "eh"
    { f1: 300, f2: 2200, f3: 3000 }, // bright "ee"
    { f1: 700, f2: 1100, f3: 2500 }, // open "ah"
  ];
  const bw = [120, 180, 250];
  const baseFreq = 130.81;

  for (let f = 0; f < NUM_FRAMES; f++) {
    const table = new Float32Array(tableSize + 1);
    const t = f / (NUM_FRAMES - 1);

    // Blend through singers
    const singerPos = t * (singers.length - 1);
    const sIdx = Math.min(Math.floor(singerPos), singers.length - 2);
    const sFrac = singerPos - sIdx;
    const f1 = singers[sIdx].f1 * (1 - sFrac) + singers[sIdx + 1].f1 * sFrac;
    const f2 = singers[sIdx].f2 * (1 - sFrac) + singers[sIdx + 1].f2 * sFrac;
    const f3 = singers[sIdx].f3 * (1 - sFrac) + singers[sIdx + 1].f3 * sFrac;
    const formants = [f1, f2, f3];

    for (let h = 1; h <= numH; h++) {
      const hFreq = h * baseFreq;
      let amp = 0;
      for (let fi = 0; fi < 3; fi++) {
        const diff = hFreq - formants[fi];
        amp += Math.exp(-(diff * diff) / (2 * bw[fi] * bw[fi]));
      }
      // Gentle roll-off for warm choir sound
      amp /= h;
      // Add slight "chorus" by mixing sin+cos
      if (amp > 1e-8) {
        addHarmonic(table, sineLut, tableSize, h, amp * 0.85);
        addCosHarmonic(table, sineLut, tableSize, h, amp * 0.15);
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
    case WavetablePreset.VOWEL:
      return generateVowel(tableSize);
    case WavetablePreset.METALLIC:
      return generateMetallic(tableSize);
    case WavetablePreset.HARSH:
      return generateHarsh(tableSize);
    case WavetablePreset.WARM_PAD:
      return generateWarmPad(tableSize);
    case WavetablePreset.SYNC_SWEEP:
      return generateSyncSweep(tableSize);
    case WavetablePreset.NOISE_SHAPE:
      return generateNoiseShape(tableSize);
    case WavetablePreset.BELL:
      return generateBell(tableSize);
    case WavetablePreset.CHOIR:
      return generateChoir(tableSize);
    default:
      return generateInit(tableSize);
  }
}
