"use client";
import { EnvelopePanel } from "@/components/EnvelopePanel";
import { LfoPanel } from "@/components/LfoPanel";

export function ModulatorSidebar() {
  return (
    <div className="flex flex-col gap-1 min-h-0 w-[220px] shrink-0 h-full">
      <div className="flex-1 min-h-0">
        <EnvelopePanel />
      </div>
      <div className="flex-1 min-h-0">
        <LfoPanel index="lfo1" />
      </div>
      <div className="flex-1 min-h-0">
        <LfoPanel index="lfo2" />
      </div>
    </div>
  );
}
