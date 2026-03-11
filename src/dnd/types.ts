import type { ModSource } from "@/audio/dsp/modulation/modMatrix";

export const DND_TYPES = {
  MOD_SOURCE: "MOD_SOURCE",
} as const;

export interface ModSourceDragItem {
  source: ModSource;
  label: string;
}
