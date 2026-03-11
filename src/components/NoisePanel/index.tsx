"use client";
import { Knob } from "@/components/ui/Knob";
import { Panel } from "@/components/ui/Panel";
import { Select } from "@/components/ui/Select";
import { synthState } from "@/state/synthState";
import { useSnapshot } from "valtio";

const NOISE_OPTIONS = [
  { value: "0", label: "White" },
  { value: "1", label: "Pink" },
  { value: "2", label: "Brown" },
];

export function NoisePanel() {
  const snap = useSnapshot(synthState);
  const noise = snap.noise;
  const enabled = noise.level > 0;

  return (
    <Panel
      title="NOISE"
      color="var(--accent-cyan)"
      onToggle={() => (synthState.noise.level = enabled ? 0 : 0.5)}
      enabled={enabled}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[9px] text-text-muted uppercase">Type</span>
        <Select
          value={String(noise.type)}
          options={NOISE_OPTIONS}
          onChange={(v) => (synthState.noise.type = Number(v))}
        />
      </div>
      <div className="flex justify-center">
        <Knob
          label="Level"
          value={noise.level}
          min={0}
          max={1}
          onChange={(v) => (synthState.noise.level = v)}
          color="var(--accent-cyan)"
          size={44}
        />
      </div>
    </Panel>
  );
}
