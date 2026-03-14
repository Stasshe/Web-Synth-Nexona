"use client";
import { ModTarget } from "@/audio/dsp/modulation/modMatrix";
import { Knob } from "@/components/ui/Knob";
import { Panel } from "@/components/ui/Panel";
import { SelectPopup } from "@/components/ui/SelectPopup";
import type { ModSourceDragItem } from "@/dnd/types";
import { useModRoutes } from "@/hooks/useModAmount";
import { synthState } from "@/state/synthState";
import { useCallback } from "react";
import { useSnapshot } from "valtio";

const NOISE_OPTIONS = [
  { value: "0", label: "White" },
  { value: "1", label: "Pink" },
  { value: "2", label: "Brown" },
];

export function NoisePanel() {
  const snap = useSnapshot(synthState);
  const noise = snap.noise;
  const sub = snap.oscillators.sub;
  const enabled = noise.level > 0;

  const modNoiseLevel = useModRoutes(ModTarget.NOISE_LEVEL);
  const modSubLevel = useModRoutes(ModTarget.SUB_LEVEL);

  const handleModDrop = useCallback(
    (target: ModTarget) => (item: ModSourceDragItem) => {
      synthState.modulations.push({ source: item.source, target, amount: 0.5 });
    },
    [],
  );

  return (
    <Panel
      title="NOISE / SUB"
      color="var(--accent-cyan)"
      onToggle={() => (synthState.noise.level = enabled ? 0 : 0.5)}
      enabled={enabled}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[9px] text-text-muted uppercase">Type</span>
        <SelectPopup
          value={String(noise.type)}
          options={NOISE_OPTIONS}
          onChange={(v) => (synthState.noise.type = Number(v))}
        />
      </div>
      <div className="flex justify-center gap-3">
        <Knob
          label="Noise"
          value={noise.level}
          min={0}
          max={1}
          onChange={(v) => (synthState.noise.level = v)}
          color="var(--accent-cyan)"
          size={36}
          modRoutes={modNoiseLevel}
          onModDrop={handleModDrop(ModTarget.NOISE_LEVEL)}
          modTarget={ModTarget.NOISE_LEVEL}
        />
        <Knob
          label="Sub"
          value={sub.level}
          min={0}
          max={1}
          onChange={(v) => (synthState.oscillators.sub.level = v)}
          color="var(--accent-cyan)"
          size={36}
          modRoutes={modSubLevel}
          onModDrop={handleModDrop(ModTarget.SUB_LEVEL)}
          modTarget={ModTarget.SUB_LEVEL}
        />
      </div>
    </Panel>
  );
}
