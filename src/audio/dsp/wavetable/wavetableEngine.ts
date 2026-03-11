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

const NUM_FRAMES = 256;
const MAX_HARMONICS = 256;

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

export function generateSineTable(tableSize: number): Wavetable {
  const frames: Float32Array[] = [];
  for (let f = 0; f < NUM_FRAMES; f++) {
    const table = new Float32Array(tableSize + 1);
    const numH = 1 + Math.floor((f / (NUM_FRAMES - 1)) * (MAX_HARMONICS - 1));
    for (let h = 1; h <= numH; h++) {
      const amp = 1 / h;
      for (let i = 0; i <= tableSize; i++) {
        table[i] += amp * Math.sin((2 * Math.PI * h * i) / tableSize);
      }
    }
    normalize(table, tableSize);
    table[tableSize] = table[0];
    frames.push(table);
  }
  return { frames, tableSize, numFrames: NUM_FRAMES };
}

export function generateSawTable(tableSize: number): Wavetable {
  const frames: Float32Array[] = [];
  for (let f = 0; f < NUM_FRAMES; f++) {
    const table = new Float32Array(tableSize + 1);
    const numH = 1 + Math.floor((f / (NUM_FRAMES - 1)) * (MAX_HARMONICS - 1));
    for (let h = 1; h <= numH; h++) {
      const amp = 1 / h;
      for (let i = 0; i <= tableSize; i++) {
        table[i] += amp * Math.sin((2 * Math.PI * h * i) / tableSize);
      }
    }
    normalize(table, tableSize);
    table[tableSize] = table[0];
    frames.push(table);
  }
  return { frames, tableSize, numFrames: NUM_FRAMES };
}

export function generateSquareTable(tableSize: number): Wavetable {
  const frames: Float32Array[] = [];
  for (let f = 0; f < NUM_FRAMES; f++) {
    const table = new Float32Array(tableSize + 1);
    const numH = 1 + Math.floor((f / (NUM_FRAMES - 1)) * (MAX_HARMONICS - 1));
    for (let h = 1; h <= numH; h += 2) {
      const amp = 1 / h;
      for (let i = 0; i <= tableSize; i++) {
        table[i] += amp * Math.sin((2 * Math.PI * h * i) / tableSize);
      }
    }
    normalize(table, tableSize);
    table[tableSize] = table[0];
    frames.push(table);
  }
  return { frames, tableSize, numFrames: NUM_FRAMES };
}

export function generateTriangleTable(tableSize: number): Wavetable {
  const frames: Float32Array[] = [];
  for (let f = 0; f < NUM_FRAMES; f++) {
    const table = new Float32Array(tableSize + 1);
    const numH = 1 + Math.floor((f / (NUM_FRAMES - 1)) * (MAX_HARMONICS - 1));
    for (let h = 1; h <= numH; h += 2) {
      const sign = ((h - 1) / 2) % 2 === 0 ? 1 : -1;
      const amp = sign / (h * h);
      for (let i = 0; i <= tableSize; i++) {
        table[i] += amp * Math.sin((2 * Math.PI * h * i) / tableSize);
      }
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
