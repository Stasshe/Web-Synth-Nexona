export function midiToFreq(note: number): number {
  return 440 * 2 ** ((note - 69) / 12);
}

export function centsToRatio(cents: number): number {
  return 2 ** (cents / 1200);
}

export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

export function dbToGain(db: number): number {
  return 10 ** (db / 20);
}
