/**
 * Vital-style filter registry — 8 models ordered by FilterModelIndex.
 * The model index (0–7) is stored in the SAB as FilterType.
 * Style (0–N) is stored separately as FilterStyle.
 */
import { ANALOG_MODEL } from "./analogFilter";
import { COMB_MODEL } from "./combFilter";
import { DIGITAL_MODEL } from "./digitalFilter";
import { DIODE_MODEL } from "./diodeFilter";
import { DIRTY_MODEL } from "./dirtyFilter";
import { FORMANT_MODEL } from "./formantFilter";
import { LADDER_MODEL } from "./ladderFilter";
import { PHASER_MODEL } from "./phaserFilter";
import type { FilterModel, FilterProcessor } from "./filterTypes";

/**
 * All 8 filter models, indexed by FilterModelIndex enum value.
 * 0=Analog, 1=Dirty, 2=Ladder, 3=Digital, 4=Diode, 5=Formant, 6=Comb, 7=Phaser
 */
export const FILTER_MODELS: FilterModel[] = [
  ANALOG_MODEL, // 0
  DIRTY_MODEL, // 1
  LADDER_MODEL, // 2
  DIGITAL_MODEL, // 3
  DIODE_MODEL, // 4
  FORMANT_MODEL, // 5
  COMB_MODEL, // 6
  PHASER_MODEL, // 7
];

export function getFilterModel(modelIndex: number): FilterModel {
  return FILTER_MODELS[modelIndex] ?? FILTER_MODELS[0];
}

export function createFilter(modelIndex: number, sampleRate: number): FilterProcessor {
  return getFilterModel(modelIndex).create(sampleRate);
}

export const FILTER_MODEL_COUNT = FILTER_MODELS.length;
