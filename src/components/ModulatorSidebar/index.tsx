"use client";
import { EnvelopePanel } from "@/components/EnvelopePanel";
import { LfoPanel } from "@/components/LfoPanel";
import { RandomPanel } from "@/components/RandomPanel";

export function ModulatorSidebar() {
  return (
    <div className="flex flex-col gap-1 min-h-0 w-[220px] shrink-0 h-full overflow-y-auto pr-0.5 custom-scrollbar">
      <div className="shrink-0">
        <EnvelopePanel />
      </div>
      <div className="shrink-0">
        <LfoPanel index="lfo1" />
      </div>
      <div className="shrink-0">
        <LfoPanel index="lfo2" />
      </div>
      <div className="shrink-0">
        <RandomPanel />
      </div>
    </div>
  );
}
