"use client";
import { EnvelopePanel } from "@/components/EnvelopePanel";
import { LfoPanel } from "@/components/LfoPanel";
import { ModulationPanel } from "@/components/ModulationPanel";

export function ModulatorSidebar() {
  return (
    <div className="flex flex-col gap-1 min-h-0 overflow-y-auto w-[220px] shrink-0">
      <EnvelopePanel />
      <LfoPanel index="lfo1" />
      <LfoPanel index="lfo2" />
      <ModulationPanel />
    </div>
  );
}
