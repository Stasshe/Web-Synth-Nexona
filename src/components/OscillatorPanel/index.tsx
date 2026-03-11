"use client";
import { Knob } from "@/components/ui/Knob";
import { Panel } from "@/components/ui/Panel";
import { Select } from "@/components/ui/Select";
import { Toggle } from "@/components/ui/Toggle";
import { synthState } from "@/state/synthState";
import { useSnapshot } from "valtio";

const WARP_OPTIONS = [
  { value: "0", label: "None" },
  { value: "1", label: "Bend" },
  { value: "2", label: "Sync" },
  { value: "3", label: "PD" },
  { value: "4", label: "Mirror" },
  { value: "5", label: "Quantize" },
  { value: "6", label: "FM" },
];

const WAVEFORM_OPTIONS = [
  { value: "0", label: "Sine" },
  { value: "1", label: "Saw" },
  { value: "2", label: "Square" },
  { value: "3", label: "Triangle" },
];

interface OscillatorPanelProps {
  osc: "a" | "b";
  onOpenWaveEditor?: () => void;
}

export function OscillatorPanel({ osc, onOpenWaveEditor }: OscillatorPanelProps) {
  const snap = useSnapshot(synthState);
  const data = snap.oscillators[osc];
  const state = synthState.oscillators[osc];
  const color = osc === "a" ? "var(--osc-a)" : "var(--osc-b)";

  return (
    <Panel title={`OSC ${osc.toUpperCase()}`} color={color}>
      <div className="flex items-center justify-between mb-3">
        <Toggle value={data.on} onChange={(v) => (state.on = v)} color={color} />
        <div className="flex gap-1">
          <Select
            value={String(data.waveformType)}
            options={WAVEFORM_OPTIONS}
            onChange={(v) => (state.waveformType = Number(v))}
          />
          <button
            type="button"
            onClick={onOpenWaveEditor}
            className="px-1.5 py-0.5 text-[9px] text-text-muted hover:text-text-primary bg-bg-surface border border-border-default rounded cursor-pointer transition-colors"
            title="Open waveform editor"
          >
            Draw
          </button>
          <Select
            value={String(data.warpType)}
            options={WARP_OPTIONS}
            onChange={(v) => (state.warpType = Number(v))}
          />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <Knob
          label="Level"
          value={data.level}
          min={0}
          max={1}
          onChange={(v) => (state.level = v)}
          color={color}
        />
        <Knob
          label="Frame"
          value={data.framePosition}
          min={0}
          max={1}
          onChange={(v) => (state.framePosition = v)}
          color={color}
        />
        <Knob
          label="Detune"
          value={data.detune}
          min={-100}
          max={100}
          step={1}
          onChange={(v) => (state.detune = v)}
          color={color}
          formatValue={(v) => `${v > 0 ? "+" : ""}${v.toFixed(0)}ct`}
        />
        <Knob
          label="Warp"
          value={data.warpAmount}
          min={0}
          max={1}
          onChange={(v) => (state.warpAmount = v)}
          color={color}
        />
      </div>

      <div className="grid grid-cols-3 gap-2 mt-2">
        <Knob
          label="Unison"
          value={data.unisonVoices}
          min={1}
          max={16}
          step={1}
          onChange={(v) => (state.unisonVoices = v)}
          color={color}
          formatValue={(v) => v.toFixed(0)}
        />
        <Knob
          label="U.Det"
          value={data.unisonDetune}
          min={0}
          max={100}
          step={1}
          onChange={(v) => (state.unisonDetune = v)}
          color={color}
          formatValue={(v) => `${v.toFixed(0)}ct`}
        />
        <Knob
          label="Spread"
          value={data.unisonSpread}
          min={0}
          max={1}
          onChange={(v) => (state.unisonSpread = v)}
          color={color}
        />
      </div>
    </Panel>
  );
}
