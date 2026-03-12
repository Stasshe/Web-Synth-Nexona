"use client";
import { FilterPanel } from "@/components/FilterPanel";
import { NoisePanel } from "@/components/NoisePanel";
import { OscillatorPanel } from "@/components/OscillatorPanel";

interface VoicePageProps {
  onOpenWaveEditor: (osc: "a" | "b" | "c") => void;
}

export function VoicePage({ onOpenWaveEditor }: VoicePageProps) {
  return (
    <div className="flex flex-col gap-1 h-full overflow-y-auto pr-0.5 custom-scrollbar">
      {/* Row 1: Three oscillators */}
      <div className="grid grid-cols-3 gap-1 shrink-0">
        <div className="min-h-[300px]">
          <OscillatorPanel osc="a" onOpenWaveEditor={() => onOpenWaveEditor("a")} />
        </div>
        <div className="min-h-[300px]">
          <OscillatorPanel osc="b" onOpenWaveEditor={() => onOpenWaveEditor("b")} />
        </div>
        <div className="min-h-[300px]">
          <OscillatorPanel osc="c" onOpenWaveEditor={() => onOpenWaveEditor("c")} />
        </div>
      </div>

      {/* Row 2: Noise + two filters */}
      <div className="grid grid-cols-3 gap-1 shrink-0">
        <div className="min-h-[300px]">
          <NoisePanel />
        </div>
        <div className="min-h-[300px]">
          <FilterPanel filter={1} />
        </div>
        <div className="min-h-[300px]">
          <FilterPanel filter={2} />
        </div>
      </div>
    </div>
  );
}
