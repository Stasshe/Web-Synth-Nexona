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

export function generateSineTable(tableSize: number): Wavetable {
  const table = new Float32Array(tableSize + 1);
  for (let i = 0; i <= tableSize; i++) {
    table[i] = Math.sin((2 * Math.PI * i) / tableSize);
  }
  return { frames: [table], tableSize, numFrames: 1 };
}

export function generateSawTable(tableSize: number): Wavetable {
  const table = new Float32Array(tableSize + 1);
  for (let i = 0; i <= tableSize; i++) {
    table[i] = 2 * (i / tableSize) - 1;
  }
  table[tableSize] = table[0];
  return { frames: [table], tableSize, numFrames: 1 };
}

export function generateSquareTable(tableSize: number): Wavetable {
  const table = new Float32Array(tableSize + 1);
  for (let i = 0; i <= tableSize; i++) {
    table[i] = i / tableSize < 0.5 ? 1 : -1;
  }
  table[tableSize] = table[0];
  return { frames: [table], tableSize, numFrames: 1 };
}

export function generateTriangleTable(tableSize: number): Wavetable {
  const table = new Float32Array(tableSize + 1);
  for (let i = 0; i <= tableSize; i++) {
    const phase = i / tableSize;
    if (phase < 0.25) {
      table[i] = phase * 4;
    } else if (phase < 0.75) {
      table[i] = 2 - phase * 4;
    } else {
      table[i] = phase * 4 - 4;
    }
  }
  table[tableSize] = table[0];
  return { frames: [table], tableSize, numFrames: 1 };
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
