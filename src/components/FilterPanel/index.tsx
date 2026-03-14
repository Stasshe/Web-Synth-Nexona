"use client";
import { FILTER_REGISTRY, getFilterCategories } from "@/audio/dsp/filter/filterRegistry";
import { ModTarget } from "@/audio/dsp/modulation/modMatrix";
import { Knob } from "@/components/ui/Knob";
import { Panel } from "@/components/ui/Panel";
import { SelectWithArrows } from "@/components/ui/SelectWithArrows";
import type { ModSourceDragItem } from "@/dnd/types";
import { useModRoutes } from "@/hooks/useModAmount";
import { synthState } from "@/state/synthState";
import { useCallback } from "react";
import { useSnapshot } from "valtio";

interface FilterPanelProps {
  filter?: 1 | 2;
}

const CATEGORY_COLORS: Record<string, string> = {
  Analog: "var(--filter)",
  Ladder: "var(--accent-orange)",
  Comb: "var(--accent-purple)",
  Formant: "var(--accent-green)",
};

export function FilterPanel({ filter = 1 }: FilterPanelProps) {
  const snap = useSnapshot(synthState);
  const f = filter === 1 ? snap.filter : snap.filter2;
  const state = filter === 1 ? synthState.filter : synthState.filter2;
  const cutoffTarget = filter === 1 ? ModTarget.FILTER_CUTOFF : ModTarget.FILTER2_CUTOFF;
  const resoTarget = filter === 1 ? ModTarget.FILTER_RESONANCE : ModTarget.FILTER2_RESONANCE;
  const driveTarget = filter === 1 ? ModTarget.FILTER_DRIVE : ModTarget.FILTER2_DRIVE;
  const envAmtTarget = filter === 1 ? ModTarget.FILTER_ENV_AMOUNT : ModTarget.FILTER2_ENV_AMOUNT;

  const modCutoff = useModRoutes(cutoffTarget);
  const modReso = useModRoutes(resoTarget);
  const modDrive = useModRoutes(driveTarget);
  const modEnvAmt = useModRoutes(envAmtTarget);

  const handleModDrop = useCallback(
    (target: ModTarget) => (item: ModSourceDragItem) => {
      synthState.modulations.push({ source: item.source, target, amount: 0.5 });
    },
    [],
  );

  const categories = getFilterCategories();
  const currentDef = FILTER_REGISTRY[f.type] ?? FILTER_REGISTRY[0];
  const color = CATEGORY_COLORS[currentDef.category] ?? "var(--filter)";

  const categoryOptions = categories.map((cat) => ({ value: cat, label: cat }));
  const typeOptions = FILTER_REGISTRY.map((def, idx) => ({ def, idx }))
    .filter(({ def }) => def.category === currentDef.category)
    .map(({ def, idx }) => ({ value: String(idx), label: def.name }));

  return (
    <Panel
      title={`FILTER ${filter}`}
      color={color}
      onToggle={() => (state.on = !state.on)}
      enabled={f.on}
    >
      {/* Input source selection */}
      <div className="flex gap-0.5 mb-1">
        <span className="text-[8px] text-text-muted mr-1 self-center">IN</span>
        {(
          [
            { label: "A", bit: 0 },
            { label: "B", bit: 1 },
            { label: "C", bit: 2 },
            { label: "N", bit: 3 },
            ...(filter === 2 ? [{ label: "F1", bit: 4 }] : []),
          ] as const
        ).map(({ label, bit }) => {
          const isActive = (f.input & (1 << bit)) !== 0;
          return (
            <button
              key={label}
              type="button"
              onClick={() => (state.input = f.input ^ (1 << bit))}
              className="px-1.5 py-0.5 text-[8px] rounded border transition-colors cursor-pointer font-mono"
              style={{
                borderColor: isActive ? color : "var(--border)",
                color: isActive ? color : "var(--text-muted)",
                backgroundColor: isActive
                  ? `color-mix(in srgb, ${color} 25%, transparent)`
                  : "transparent",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Category selector */}
      <SelectWithArrows
        value={currentDef.category}
        options={categoryOptions}
        onChange={(cat) => {
          const first = FILTER_REGISTRY.findIndex((d) => d.category === cat);
          if (first >= 0) state.type = first;
        }}
        accentColor={color}
        className="mb-1"
      />

      {/* Type selector */}
      <SelectWithArrows
        value={String(f.type)}
        options={typeOptions}
        onChange={(v) => (state.type = Number(v))}
        accentColor={color}
        className="mb-1.5"
      />

      {/* All knobs on one row: Cutoff + Reso + Drive + Env */}
      <div className="grid grid-cols-4 gap-1">
        <Knob
          label="Cutoff"
          value={f.cutoff}
          min={20}
          max={20000}
          step={1}
          onChange={(v) => (state.cutoff = v)}
          size={36}
          color={color}
          formatValue={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${v.toFixed(0)}`)}
          modRoutes={modCutoff}
          onModDrop={handleModDrop(cutoffTarget)}
          modTarget={cutoffTarget}
        />
        <Knob
          label="Reso"
          value={f.resonance}
          min={0}
          max={0.99}
          onChange={(v) => (state.resonance = v)}
          color={color}
          size={36}
          modRoutes={modReso}
          onModDrop={handleModDrop(resoTarget)}
          modTarget={resoTarget}
        />
        <Knob
          label="Drive"
          value={f.drive}
          min={1}
          max={10}
          step={0.1}
          onChange={(v) => (state.drive = v)}
          color={color}
          size={36}
          formatValue={(v) => `${v.toFixed(1)}x`}
          modRoutes={modDrive}
          onModDrop={handleModDrop(driveTarget)}
          modTarget={driveTarget}
        />
        <Knob
          label="Env"
          value={f.envAmount}
          min={-1}
          max={1}
          onChange={(v) => (state.envAmount = v)}
          color={color}
          size={36}
          formatValue={(v) => `${(v * 100).toFixed(0)}%`}
          modRoutes={modEnvAmt}
          onModDrop={handleModDrop(envAmtTarget)}
          modTarget={envAmtTarget}
        />
      </div>
    </Panel>
  );
}
