import type { ModSource } from "@/audio/dsp/modulation/modMatrix";

export const DND_TYPES = {
  MOD_SOURCE: "MOD_SOURCE",
  EFFECT_SLOT: "EFFECT_SLOT",
} as const;

export interface ModSourceDragItem {
  source: ModSource;
  label: string;
}

export interface EffectSlotDragItem {
  effectName: string;
  index: number;
}
