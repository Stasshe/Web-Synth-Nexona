"use client";
import { FilterPanel } from "@/components/FilterPanel";
import { OscillatorPanel } from "@/components/OscillatorPanel";
import { SubNoisePanel } from "@/components/SubNoisePanel";

interface VoicePageProps {
  onOpenWaveEditor: (osc: "a" | "b" | "c" | "sub") => void;
}

export function VoicePage({ onOpenWaveEditor }: VoicePageProps) {
  return (
    <div className="flex flex-col gap-1 min-h-0 h-full">
      {/* Row 1: Three oscillators */}
      <div className="grid grid-cols-3 gap-1 flex-1 min-h-0">
        <OscillatorPanel osc="a" onOpenWaveEditor={() => onOpenWaveEditor("a")} />
        <OscillatorPanel osc="b" onOpenWaveEditor={() => onOpenWaveEditor("b")} />
        <OscillatorPanel osc="c" onOpenWaveEditor={() => onOpenWaveEditor("c")} />
      </div>

      {/* Row 2: Sub/Noise + two filters */}
      <div className="grid grid-cols-3 gap-1 flex-1 min-h-0">
        <SubNoisePanel onOpenSubWaveEditor={() => onOpenWaveEditor("sub")} />
        <FilterPanel filter={1} />
        <FilterPanel filter={2} />
      </div>
    </div>
  );
}
