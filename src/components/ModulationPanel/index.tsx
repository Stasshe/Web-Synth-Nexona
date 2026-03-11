"use client";
import type { ModRoute } from "@/audio/dsp/modulation/modMatrix";
import { Panel } from "@/components/ui/Panel";
import { Select } from "@/components/ui/Select";
import { synthState } from "@/state/synthState";
import { useSnapshot } from "valtio";

const MOD_SOURCES = [
  { value: "0", label: "LFO 1" },
  { value: "1", label: "LFO 2" },
  { value: "2", label: "Amp Env" },
  { value: "3", label: "Flt Env" },
  { value: "4", label: "Velocity" },
  { value: "5", label: "Key Track" },
  { value: "6", label: "Macro 1" },
  { value: "7", label: "Macro 2" },
  { value: "8", label: "Macro 3" },
  { value: "9", label: "Macro 4" },
];

const MOD_TARGETS = [
  { value: "0", label: "Osc A Pitch" },
  { value: "1", label: "Osc A Frame" },
  { value: "2", label: "Osc A Warp" },
  { value: "3", label: "Osc A Level" },
  { value: "4", label: "Osc B Pitch" },
  { value: "5", label: "Osc B Frame" },
  { value: "6", label: "Osc B Warp" },
  { value: "7", label: "Osc B Level" },
  { value: "8", label: "Flt Cutoff" },
  { value: "9", label: "Flt Reso" },
  { value: "10", label: "Amp Level" },
  { value: "11", label: "Pan" },
];

interface ModPanelProps {
  onModRoutesChange?: (routes: ModRoute[]) => void;
}

export function ModulationPanel({ onModRoutesChange }: ModPanelProps) {
  const snap = useSnapshot(synthState);
  const routes = snap.modulations;

  const addRoute = () => {
    synthState.modulations.push({ source: 0, target: 8, amount: 0.5 });
    onModRoutesChange?.(synthState.modulations as ModRoute[]);
  };

  const removeRoute = (idx: number) => {
    synthState.modulations.splice(idx, 1);
    onModRoutesChange?.(synthState.modulations as ModRoute[]);
  };

  const updateRoute = (idx: number, field: keyof ModRoute, value: number) => {
    (synthState.modulations[idx] as Record<string, number>)[field] = value;
    onModRoutesChange?.(synthState.modulations as ModRoute[]);
  };

  return (
    <Panel title="MODULATION" color="var(--accent-purple)">
      <div className="space-y-1.5 max-h-[150px] overflow-y-auto">
        {routes.map((route, idx) => (
          <div key={idx} className="flex items-center gap-1">
            <Select
              value={String(route.source)}
              options={MOD_SOURCES}
              onChange={(v) => updateRoute(idx, "source", Number(v))}
              className="flex-1 text-[9px]"
            />
            <span className="text-[9px] text-text-muted">&rarr;</span>
            <Select
              value={String(route.target)}
              options={MOD_TARGETS}
              onChange={(v) => updateRoute(idx, "target", Number(v))}
              className="flex-1 text-[9px]"
            />
            <input
              type="range"
              min={-1}
              max={1}
              step={0.01}
              value={route.amount}
              onChange={(e) => updateRoute(idx, "amount", Number(e.target.value))}
              className="w-16"
            />
            <span className="text-[9px] text-text-secondary w-8 text-right">
              {(route.amount * 100).toFixed(0)}%
            </span>
            <button
              type="button"
              onClick={() => removeRoute(idx)}
              className="text-text-muted hover:text-accent-red text-xs px-1"
            >
              x
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addRoute}
        className="mt-2 w-full text-[10px] py-1 rounded border border-border-default text-text-muted hover:text-text-secondary hover:border-accent-purple transition-colors"
      >
        + Add Route
      </button>
    </Panel>
  );
}
