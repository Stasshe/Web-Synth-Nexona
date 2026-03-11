"use client";
import { ModTarget } from "@/audio/dsp/modulation/modMatrix";
import { Knob } from "@/components/ui/Knob";
import { Panel } from "@/components/ui/Panel";
import { Select } from "@/components/ui/Select";
import { Toggle } from "@/components/ui/Toggle";
import type { ModSourceDragItem } from "@/dnd/types";
import { useModAmount } from "@/hooks/useModAmount";
import { synthState } from "@/state/synthState";
import { useCallback } from "react";
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

interface OscillatorPanelProps {
  osc: "a" | "b";
  onOpenWaveEditor?: () => void;
}

export function OscillatorPanel({ osc, onOpenWaveEditor }: OscillatorPanelProps) {
  const snap = useSnapshot(synthState);
  const data = snap.oscillators[osc];
  const state = synthState.oscillators[osc];
  const color = osc === "a" ? "var(--osc-a)" : "var(--osc-b)";

  const levelTarget = osc === "a" ? ModTarget.OSC_A_LEVEL : ModTarget.OSC_B_LEVEL;
  const frameTarget = osc === "a" ? ModTarget.OSC_A_FRAME : ModTarget.OSC_B_FRAME;
  const warpTarget = osc === "a" ? ModTarget.OSC_A_WARP_AMOUNT : ModTarget.OSC_B_WARP_AMOUNT;
  const pitchTarget = osc === "a" ? ModTarget.OSC_A_PITCH : ModTarget.OSC_B_PITCH;

  const modLevel = useModAmount(levelTarget);
  const modFrame = useModAmount(frameTarget);
  const modWarp = useModAmount(warpTarget);
  const modPitch = useModAmount(pitchTarget);

  const handleModDrop = useCallback(
    (target: ModTarget) => (item: ModSourceDragItem) => {
      synthState.modulations.push({
        source: item.source,
        target,
        amount: 0.5,
      });
    },
    [],
  );

  return (
    <Panel title={`OSC ${osc.toUpperCase()}`} color={color}>
      <div className="flex items-center justify-between mb-3">
        <Toggle value={data.on} onChange={(v) => (state.on = v)} color={color} />
        <div className="flex gap-1">
          <button
            type="button"
            onClick={onOpenWaveEditor}
            className="px-2 py-0.5 text-[10px] text-text-secondary hover:text-text-primary bg-bg-surface border border-border-default rounded cursor-pointer transition-colors"
            title="Edit waveform"
          >
            {data.waveformName}
            {data.customWaveform ? "*" : ""}
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
          modAmount={modLevel}
          onModDrop={handleModDrop(levelTarget)}
        />
        <Knob
          label="Frame"
          value={data.framePosition}
          min={0}
          max={1}
          onChange={(v) => (state.framePosition = v)}
          color={color}
          modAmount={modFrame}
          onModDrop={handleModDrop(frameTarget)}
        />
        <Knob
          label="Detune"
          value={data.detune}
          min={-100}
          max={100}
          step={1}
          onChange={(v) => (state.detune = v)}
          color={color}
          modAmount={modPitch}
          onModDrop={handleModDrop(pitchTarget)}
          formatValue={(v) => `${v > 0 ? "+" : ""}${v.toFixed(0)}ct`}
        />
        <Knob
          label="Warp"
          value={data.warpAmount}
          min={0}
          max={1}
          onChange={(v) => (state.warpAmount = v)}
          color={color}
          modAmount={modWarp}
          onModDrop={handleModDrop(warpTarget)}
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
