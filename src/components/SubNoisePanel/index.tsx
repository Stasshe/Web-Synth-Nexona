"use client";
import { Knob } from "@/components/ui/Knob";
import { Panel } from "@/components/ui/Panel";
import { Select } from "@/components/ui/Select";
import { Toggle } from "@/components/ui/Toggle";
import { synthState } from "@/state/synthState";
import { useSnapshot } from "valtio";

const NOISE_OPTIONS = [
  { value: "0", label: "White" },
  { value: "1", label: "Pink" },
  { value: "2", label: "Brown" },
];

interface SubNoisePanelProps {
  onOpenSubWaveEditor?: () => void;
}

export function SubNoisePanel({ onOpenSubWaveEditor }: SubNoisePanelProps) {
  const snap = useSnapshot(synthState);
  const sub = snap.oscillators.sub;
  const noise = snap.noise;

  return (
    <Panel title="SUB / NOISE" color="var(--accent-cyan)">
      {/* Sub section */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-text-muted uppercase">Sub</span>
        <Toggle
          value={sub.on}
          onChange={(v) => (synthState.oscillators.sub.on = v)}
          color="var(--accent-cyan)"
        />
      </div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        <Knob
          label="Level"
          value={sub.level}
          min={0}
          max={1}
          onChange={(v) => (synthState.oscillators.sub.level = v)}
          color="var(--accent-cyan)"
        />
        <Knob
          label="Octave"
          value={sub.octave}
          min={-2}
          max={-1}
          step={1}
          onChange={(v) => (synthState.oscillators.sub.octave = v)}
          color="var(--accent-cyan)"
          formatValue={(v) => `${v}`}
        />
        <button
          type="button"
          onClick={onOpenSubWaveEditor}
          className="self-center px-2 py-1 text-[10px] text-text-muted hover:text-text-primary bg-bg-surface border border-border-default rounded cursor-pointer transition-colors"
          title="Edit sub waveform"
        >
          {sub.waveformName ?? "Sine"}
        </button>
      </div>

      {/* Noise section */}
      <div className="border-t border-border-default pt-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-text-muted uppercase">Noise</span>
          <Select
            value={String(noise.type)}
            options={NOISE_OPTIONS}
            onChange={(v) => (synthState.noise.type = Number(v))}
          />
        </div>
        <Knob
          label="Level"
          value={noise.level}
          min={0}
          max={1}
          onChange={(v) => (synthState.noise.level = v)}
          color="var(--accent-cyan)"
        />
      </div>
    </Panel>
  );
}
