"use client";

import type { ModTarget } from "@/audio/dsp/modulation/modMatrix";
import { synthState } from "@/state/synthState";
import { useSnapshot } from "valtio";

export function useModAmount(target: ModTarget): number {
  const snap = useSnapshot(synthState);
  let total = 0;
  for (const route of snap.modulations) {
    if (route.target === target) {
      total += route.amount;
    }
  }
  return total;
}
