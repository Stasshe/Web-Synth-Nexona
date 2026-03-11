"use client";

import type { ModTarget } from "@/audio/dsp/modulation/modMatrix";
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
