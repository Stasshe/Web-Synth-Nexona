import { generatePreset } from "./wavetablePresets";

export interface Wavetable {
  frames: Float32Array[];
  tableSize: number;
  numFrames: number;
}

export { WavetablePreset, PRESET_NAMES, PRESET_COUNT } from "./wavetablePresets";

export function generateWavetableByIndex(index: number, tableSize: number): Wavetable {
  return generatePreset(index, tableSize);
}
