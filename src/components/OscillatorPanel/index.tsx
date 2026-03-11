"use client";
import { ModTarget } from "@/audio/dsp/modulation/modMatrix";
import { Knob } from "@/components/ui/Knob";
import { Panel } from "@/components/ui/Panel";
import { Select } from "@/components/ui/Select";
import { Toggle } from "@/components/ui/Toggle";
import type { ModSourceDragItem } from "@/dnd/types";
import { useModRoutes } from "@/hooks/useModAmount";
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
  osc: "a" | "b" | "c";
  onOpenWaveEditor?: () => void;
}

const OSC_COLORS: Record<string, string> = {
  a: "var(--osc-a)",
  b: "var(--osc-b)",
  c: "var(--osc-c)",
};

const OSC_MOD_TARGETS: Record<string, { level: ModTarget; frame: ModTarget; warp: ModTarget; pitch: ModTarget }> = {
  a: { level: ModTarget.OSC_A_LEVEL, frame: ModTarget.OSC_A_FRAME, warp: ModTarget.OSC_A_WARP_AMOUNT, pitch: ModTarget.OSC_A_PITCH },
  b: { level: ModTarget.OSC_B_LEVEL, frame: ModTarget.OSC_B_FRAME, warp: ModTarget.OSC_B_WARP_AMOUNT, pitch: ModTarget.OSC_B_PITCH },
  c: { level: ModTarget.OSC_C_LEVEL, frame: ModTarget.OSC_C_FRAME, warp: ModTarget.OSC_C_WARP_AMOUNT, pitch: ModTarget.OSC_C_PITCH },
};

export function OscillatorPanel({ osc, onOpenWaveEditor }: OscillatorPanelProps) {
  const snap = useSnapshot(synthState);
  const data = snap.oscillators[osc];
  const state = synthState.oscillators[osc];
  const color = OSC_COLORS[osc];
  const targets = OSC_MOD_TARGETS[osc];

  const modLevel = useModRoutes(targets.level);
  const modFrame = useModRoutes(targets.frame);
  const modWarp = useModRoutes(targets.warp);
  const modPitch = useModRoutes(targets.pitch);

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
          modRoutes={modLevel}
          onModDrop={handleModDrop(targets.level)}
        />
        <Knob
          label="Frame"
          value={data.framePosition}
          min={0}
          max={1}
          onChange={(v) => (state.framePosition = v)}
          color={color}
          modRoutes={modFrame}
          onModDrop={handleModDrop(targets.frame)}
        />
        <Knob
          label="Detune"
          value={data.detune}
          min={-100}
          max={100}
          step={1}
          onChange={(v) => (state.detune = v)}
          color={color}
          modRoutes={modPitch}
          onModDrop={handleModDrop(targets.pitch)}
          formatValue={(v) => `${v > 0 ? "+" : ""}${v.toFixed(0)}ct`}
        />
        <Knob
          label="Warp"
          value={data.warpAmount}
          min={0}
          max={1}
          onChange={(v) => (state.warpAmount = v)}
          color={color}
          modRoutes={modWarp}
          onModDrop={handleModDrop(targets.warp)}
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
