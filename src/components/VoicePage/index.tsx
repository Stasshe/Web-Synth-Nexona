"use client";
import { FilterPanel } from "@/components/FilterPanel";
import { NoisePanel } from "@/components/NoisePanel";
import { OscillatorPanel } from "@/components/OscillatorPanel";

interface VoicePageProps {
  onOpenWaveEditor: (osc: "a" | "b" | "c") => void;
}

export function VoicePage({ onOpenWaveEditor }: VoicePageProps) {
  return (
    <div className="flex flex-col gap-1">
      {/* Row 1: Three oscillators */}
      <div className="grid grid-cols-3 gap-1">
        <OscillatorPanel osc="a" onOpenWaveEditor={() => onOpenWaveEditor("a")} />
        <OscillatorPanel osc="b" onOpenWaveEditor={() => onOpenWaveEditor("b")} />
        <OscillatorPanel osc="c" onOpenWaveEditor={() => onOpenWaveEditor("c")} />
      </div>

      {/* Row 2: Noise + two filters */}
      <div className="grid grid-cols-3 gap-1">
        <NoisePanel />
        <FilterPanel filter={1} />
        <FilterPanel filter={2} />
      </div>
    </div>
  );
}
