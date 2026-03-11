export interface Wavetable {
  frames: Float32Array[];
  tableSize: number;
  numFrames: number;
}

export function generateSineTable(tableSize: number): Wavetable {
  const table = new Float32Array(tableSize + 1);
  for (let i = 0; i <= tableSize; i++) {
    table[i] = Math.sin((2 * Math.PI * i) / tableSize);
  }
  return {
    frames: [table],
    tableSize,
    numFrames: 1,
  };
}
