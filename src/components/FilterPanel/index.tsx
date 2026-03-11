"use client";
import { FILTER_REGISTRY, getFilterCategories } from "@/audio/dsp/filter/filterRegistry";
import { ModTarget } from "@/audio/dsp/modulation/modMatrix";
import { Knob } from "@/components/ui/Knob";
import { Panel } from "@/components/ui/Panel";
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

  const modCutoff = useModRoutes(cutoffTarget);
  const modReso = useModRoutes(resoTarget);

  const handleModDrop = useCallback(
    (target: ModTarget) => (item: ModSourceDragItem) => {
      synthState.modulations.push({ source: item.source, target, amount: 0.5 });
    },
    [],
  );

  const categories = getFilterCategories();
  const currentDef = FILTER_REGISTRY[f.type] ?? FILTER_REGISTRY[0];
  const color = CATEGORY_COLORS[currentDef.category] ?? "var(--filter)";

  return (
    <Panel title={`FILTER ${filter}`} color={color}>
      {/* Category tabs */}
      <div className="flex gap-0.5 mb-1.5">
        {categories.map((cat) => {
          const catColor = CATEGORY_COLORS[cat] ?? "var(--filter)";
          const isActive = currentDef.category === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => {
                const first = FILTER_REGISTRY.findIndex((d) => d.category === cat);
                if (first >= 0) state.type = first;
              }}
              className="flex-1 text-[9px] py-0.5 rounded border transition-colors cursor-pointer"
              style={{
                borderColor: isActive ? catColor : "var(--border)",
                color: isActive ? catColor : "var(--text-muted)",
                backgroundColor: isActive
                  ? `color-mix(in srgb, ${catColor} 15%, transparent)`
                  : "transparent",
              }}
            >
              {cat.slice(0, 3).toUpperCase()}
            </button>
          );
        })}
      </div>

      {/* Filter variants within active category */}
      <div className="flex flex-wrap gap-0.5 mb-1.5">
        {FILTER_REGISTRY.map((def, idx) => {
          if (def.category !== currentDef.category) return null;
          const isSelected = f.type === idx;
          return (
            <button
              key={def.id}
              type="button"
              onClick={() => (state.type = idx)}
              className="px-1.5 py-0.5 text-[9px] rounded border transition-colors cursor-pointer"
              style={{
                borderColor: isSelected ? color : "var(--border)",
                color: isSelected ? color : "var(--text-muted)",
                backgroundColor: isSelected
                  ? `color-mix(in srgb, ${color} 20%, transparent)`
                  : "transparent",
              }}
            >
              {def.name}
            </button>
          );
        })}
      </div>

      {/* Cutoff knob centred */}
      <div className="flex justify-center mb-1.5">
        <Knob
          label="Cutoff"
          value={f.cutoff}
          min={20}
          max={20000}
          step={1}
          onChange={(v) => (state.cutoff = v)}
          size={52}
          color={color}
          formatValue={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${v.toFixed(0)}`)}
          modRoutes={modCutoff}
          onModDrop={handleModDrop(cutoffTarget)}
        />
      </div>

      {/* Reso / Drive / Env */}
      <div className="grid grid-cols-3 gap-1.5">
        <Knob
          label="Reso" value={f.resonance} min={0} max={0.99}
          onChange={(v) => (state.resonance = v)} color={color}
          modRoutes={modReso} onModDrop={handleModDrop(resoTarget)}
        />
        <Knob
          label="Drive" value={f.drive} min={1} max={10} step={0.1}
          onChange={(v) => (state.drive = v)} color={color}
          formatValue={(v) => `${v.toFixed(1)}x`}
        />
        <Knob
          label="Env" value={f.envAmount} min={-1} max={1}
          onChange={(v) => (state.envAmount = v)} color={color}
          formatValue={(v) => `${(v * 100).toFixed(0)}%`}
        />
      </div>
    </Panel>
  );
}
