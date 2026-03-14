import type { Wavetable } from "../wavetableTypes";
import { NUM_FRAMES, normalize } from "../wavetableCommon";

// Vital's "Basic Shapes" (initPredefinedWaves): morphs through 6 shapes in this exact order:
//   Sin → SaturatedSin → Triangle → Square → Pulse → Saw
// Each shape is computed directly in the time domain, mirroring Vital's PredefinedWaveFrames.
export function generateBasicShapes(tableSize: number): Wavetable {
  const shapes = [
    makeSin(tableSize),          // 0: Sin
    makeSaturatedSin(tableSize), // 1: Saturated Sin (tanh-clipped, Vital drives at amplitude 2)
    makeTriangle(tableSize),     // 2: Triangle  (peaks at t=0, trough at t=0.5)
    makeSquare(tableSize),       // 3: Square    (50% duty, symmetric around t=0)
    makePulse(tableSize),        // 4: Pulse     (25% duty, Vital's "kPulse")
    makeSaw(tableSize),          // 5: Saw       (ascending, Vital's "kSaw")
  ];

  const frames: Float32Array[] = [];
  const numShapes = shapes.length; // 6

  for (let f = 0; f < NUM_FRAMES; f++) {
    const t = f / (NUM_FRAMES - 1); // 0..1
    const pos = t * (numShapes - 1); // 0..5
    const lo = Math.min(Math.floor(pos), numShapes - 2);
    const hi = lo + 1;
    const blend = pos - lo; // 0..1 between lo and hi shape

    const table = new Float32Array(tableSize + 1);
    for (let i = 0; i < tableSize; i++) {
      table[i] = shapes[lo][i] * (1 - blend) + shapes[hi][i] * blend;
    }
    normalize(table, tableSize);
    table[tableSize] = table[0];
    frames.push(table);
  }

  return { frames, tableSize, numFrames: NUM_FRAMES };
}

// Pure sine: sin(2π·i/N)
function makeSin(tableSize: number): Float32Array {
  const buf = new Float32Array(tableSize);
  const twoPiN = (2 * Math.PI) / tableSize;
  for (let i = 0; i < tableSize; i++) buf[i] = Math.sin(i * twoPiN);
  return buf;
}

// Vital's SaturatedSin: tanh(2·sin(2π·i/N)), normalized to ±1.
// Vital stores the sine at amplitude N in frequency domain (→ amplitude 2 in time domain),
// then applies tanh element-wise — producing a rounded, "warm" waveform between sine and square.
function makeSaturatedSin(tableSize: number): Float32Array {
  const buf = new Float32Array(tableSize);
  const twoPiN = (2 * Math.PI) / tableSize;
  for (let i = 0; i < tableSize; i++) {
    buf[i] = Math.tanh(2 * Math.sin(i * twoPiN));
  }
  let max = 0;
  for (let i = 0; i < tableSize; i++) if (Math.abs(buf[i]) > max) max = Math.abs(buf[i]);
  if (max > 0) for (let i = 0; i < tableSize; i++) buf[i] /= max;
  return buf;
}

// Vital's triangle: peak (+1) at position 0, trough (-1) at position N/2.
// Four equal quarters: [1→0] [0→-1] [-1→0] [0→1]
function makeTriangle(tableSize: number): Float32Array {
  const buf = new Float32Array(tableSize);
  const s = Math.floor(tableSize / 4);
  for (let i = 0; i < s; i++) {
    const t = i / s;
    buf[i] = 1 - t;           // 1 → 0
    buf[i + s] = -t;          // 0 → -1
    buf[i + 2 * s] = t - 1;  // -1 → 0
    buf[i + 3 * s] = t;       // 0 → 1
  }
  return buf;
}

// Vital's square: +1 in first and fourth quarters, -1 in middle two (50% duty).
// This is an even-symmetric square with the "flat top" centered on t=0.
function makeSquare(tableSize: number): Float32Array {
  const buf = new Float32Array(tableSize);
  const s = Math.floor(tableSize / 4);
  for (let i = 0; i < s; i++) {
    buf[i] = 1;
    buf[i + s] = -1;
    buf[i + 2 * s] = -1;
    buf[i + 3 * s] = 1;
  }
  return buf;
}

// Vital's pulse: -1 for the first three quarters, +1 for the last quarter (25% duty cycle).
function makePulse(tableSize: number): Float32Array {
  const buf = new Float32Array(tableSize);
  const s = Math.floor(tableSize / 4);
  for (let i = 0; i < s; i++) {
    buf[i] = -1;
    buf[i + s] = -1;
    buf[i + 2 * s] = -1;
    buf[i + 3 * s] = 1;
  }
  return buf;
}

// Vital's saw: ascending ramp exactly mirroring createSaw() in wave_frame.cpp.
// Positions [N/4, 3N/4) ascend -1→0; positions [3N/4, N)∪[0, N/4) ascend 0→1.
// Discontinuity (jump from +1 to -1) falls at position N/4.
function makeSaw(tableSize: number): Float32Array {
  const buf = new Float32Array(tableSize);
  const half = Math.floor(tableSize / 2);
  const quarter = Math.floor(tableSize / 4);
  for (let i = 0; i < half; i++) {
    const t = i / half; // 0..1
    buf[(i + quarter) % tableSize] = t - 1;      // ascending -1 → 0
    buf[(i + half + quarter) % tableSize] = t;   // ascending  0 → 1
  }
  return buf;
}
