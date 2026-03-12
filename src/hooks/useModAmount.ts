"use client";

import { ModSource, type ModTarget } from "@/audio/dsp/modulation/modMatrix";
import { modFeedbackState } from "@/state/modFeedback";
import { synthState } from "@/state/synthState";
import { useSnapshot } from "valtio";

export interface ModRouteInfo {
  index: number;
  source: number;
  amount: number;
}

export function useModRoutes(target: ModTarget): ModRouteInfo[] {
  const snap = useSnapshot(synthState);
  const routes: ModRouteInfo[] = [];
  for (let i = 0; i < snap.modulations.length; i++) {
    const r = snap.modulations[i];
    if (r.target === target) {
      routes.push({ index: i, source: r.source, amount: r.amount });
    }
  }
  return routes;
}

export function useLiveModulation(target: ModTarget): number {
  const snap = useSnapshot(synthState);
  const fb = useSnapshot(modFeedbackState);

  let sum = 0;
  for (const r of snap.modulations) {
    if (r.target !== target) continue;
    let sourceVal = 0;
    switch (r.source) {
      case ModSource.LFO1:
        sourceVal = fb.lfo1Value;
        break;
      case ModSource.LFO2:
        sourceVal = fb.lfo2Value;
        break;
      case ModSource.AMP_ENV:
        sourceVal = fb.envAmpLevel;
        break;
      case ModSource.FILTER_ENV:
        sourceVal = fb.envFilterLevel;
        break;
      case ModSource.RANDOM:
        sourceVal = fb.randomValue;
        break;
      default:
        sourceVal = 0;
        break;
    }
    sum += sourceVal * r.amount;
  }
  return sum;
}
