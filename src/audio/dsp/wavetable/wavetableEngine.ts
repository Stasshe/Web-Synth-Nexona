export interface Wavetable {
  frames: Float32Array[];
  tableSize: number;
  numFrames: number;
}

export enum WavetableType {
  SINE = 0,
  SAW = 1,
  SQUARE = 2,
  TRIANGLE = 3,
}

const NUM_FRAMES = 64;
const MAX_HARMONICS = 128;

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

// Pre-compute a full-period sine lookup to avoid repeated Math.sin calls
function buildSineLookup(tableSize: number): Float32Array {
  const lut = new Float32Array(tableSize);
  const twoPiOverN = (2 * Math.PI) / tableSize;
  for (let i = 0; i < tableSize; i++) {
    lut[i] = Math.sin(i * twoPiOverN);
  }
  return lut;
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

export function generateSineTable(tableSize: number): Wavetable {
  const sineLut = buildSineLookup(tableSize);
  const frames: Float32Array[] = [];
  for (let f = 0; f < NUM_FRAMES; f++) {
    const table = new Float32Array(tableSize + 1);
    const numH = 1 + Math.floor((f / (NUM_FRAMES - 1)) * (MAX_HARMONICS - 1));
    for (let h = 1; h <= numH; h++) {
      addHarmonic(table, sineLut, tableSize, h, 1 / h);
    }
    normalize(table, tableSize);
    table[tableSize] = table[0];
    frames.push(table);
  }
  return { frames, tableSize, numFrames: NUM_FRAMES };
}

export function generateSawTable(tableSize: number): Wavetable {
  const sineLut = buildSineLookup(tableSize);
  const frames: Float32Array[] = [];
  for (let f = 0; f < NUM_FRAMES; f++) {
    const table = new Float32Array(tableSize + 1);
    const numH = 1 + Math.floor((f / (NUM_FRAMES - 1)) * (MAX_HARMONICS - 1));
    for (let h = 1; h <= numH; h++) {
      addHarmonic(table, sineLut, tableSize, h, 1 / h);
    }
    normalize(table, tableSize);
    table[tableSize] = table[0];
    frames.push(table);
  }
  return { frames, tableSize, numFrames: NUM_FRAMES };
}

export function generateSquareTable(tableSize: number): Wavetable {
  const sineLut = buildSineLookup(tableSize);
  const frames: Float32Array[] = [];
  for (let f = 0; f < NUM_FRAMES; f++) {
    const table = new Float32Array(tableSize + 1);
    const numH = 1 + Math.floor((f / (NUM_FRAMES - 1)) * (MAX_HARMONICS - 1));
    for (let h = 1; h <= numH; h += 2) {
      addHarmonic(table, sineLut, tableSize, h, 1 / h);
    }
    normalize(table, tableSize);
    table[tableSize] = table[0];
    frames.push(table);
  }
  return { frames, tableSize, numFrames: NUM_FRAMES };
}

export function generateTriangleTable(tableSize: number): Wavetable {
  const sineLut = buildSineLookup(tableSize);
  const frames: Float32Array[] = [];
  for (let f = 0; f < NUM_FRAMES; f++) {
    const table = new Float32Array(tableSize + 1);
    const numH = 1 + Math.floor((f / (NUM_FRAMES - 1)) * (MAX_HARMONICS - 1));
    for (let h = 1; h <= numH; h += 2) {
      const sign = ((h - 1) / 2) % 2 === 0 ? 1 : -1;
      addHarmonic(table, sineLut, tableSize, h, sign / (h * h));
    }
    normalize(table, tableSize);
    table[tableSize] = table[0];
    frames.push(table);
  }
  return { frames, tableSize, numFrames: NUM_FRAMES };
}

export function generateTable(type: WavetableType, tableSize: number): Wavetable {
  switch (type) {
    case WavetableType.SINE:
      return generateSineTable(tableSize);
    case WavetableType.SAW:
      return generateSawTable(tableSize);
    case WavetableType.SQUARE:
      return generateSquareTable(tableSize);
    case WavetableType.TRIANGLE:
      return generateTriangleTable(tableSize);
  }
}
