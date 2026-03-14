export const NUM_FRAMES = 64;
export const MAX_HARMONICS = 128;
export const MIN_HARMONICS = 32;

export function buildSineLookup(tableSize: number): Float32Array {
  const lut = new Float32Array(tableSize);
  const twoPiOverN = (2 * Math.PI) / tableSize;
  for (let i = 0; i < tableSize; i++) {
    lut[i] = Math.sin(i * twoPiOverN);
  }
  return lut;
}

export function normalize(data: Float32Array, size: number): void {
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

export function addHarmonic(
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

export function addCosHarmonic(
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
