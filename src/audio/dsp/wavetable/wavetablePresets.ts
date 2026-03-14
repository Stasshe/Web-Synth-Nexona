export type { Wavetable } from "./wavetableTypes";

import {
  generateInit,
  generateBasicShapes,
  generatePWM,
  generateFormant,
  generateAdditive,
  generateDigital,
  generatePluck,
  generateOrgan,
  generateVowel,
  generateMetallic,
  generateHarsh,
  generateWarmPad,
  generateSyncSweep,
  generateNoiseShape,
  generateBell,
  generateChoir,
} from "./presets";

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

export function generatePreset(preset: WavetablePreset, tableSize: number) {
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
