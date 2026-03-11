"use client";
import { Knob } from "@/components/ui/Knob";
import { Panel } from "@/components/ui/Panel";
import { synthState } from "@/state/synthState";
import { useSnapshot } from "valtio";

const FILTER_TYPES = [
  { value: "0", label: "LP" },
  { value: "1", label: "HP" },
  { value: "2", label: "BP" },
  { value: "3", label: "NOTCH" },
];

export function FilterPanel() {
  const snap = useSnapshot(synthState);
  const f = snap.filter;

  return (
    <Panel title="FILTER" color="var(--filter)">
      <div className="flex gap-1 mb-2">
        {FILTER_TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => (synthState.filter.type = Number(t.value))}
            className={`flex-1 text-[10px] py-1 rounded border transition-colors ${
              f.type === Number(t.value)
                ? "bg-filter/20 border-filter text-filter"
                : "bg-transparent border-border-default text-text-muted hover:text-text-secondary"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex justify-center mb-2">
        <Knob
          label="Cutoff"
          value={f.cutoff}
          min={20}
          max={20000}
          step={1}
          onChange={(v) => (synthState.filter.cutoff = v)}
          size={56}
          color="var(--filter)"
          formatValue={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${v.toFixed(0)}`)}
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Knob
          label="Reso"
          value={f.resonance}
          min={0}
          max={0.99}
          onChange={(v) => (synthState.filter.resonance = v)}
          color="var(--filter)"
        />
        <Knob
          label="Drive"
          value={f.drive}
          min={1}
          max={10}
          step={0.1}
          onChange={(v) => (synthState.filter.drive = v)}
          color="var(--filter)"
          formatValue={(v) => `${v.toFixed(1)}x`}
        />
        <Knob
          label="Env"
          value={f.envAmount}
          min={-1}
          max={1}
          onChange={(v) => (synthState.filter.envAmount = v)}
          color="var(--filter)"
          formatValue={(v) => `${(v * 100).toFixed(0)}%`}
        />
      </div>
    </Panel>
  );
}
