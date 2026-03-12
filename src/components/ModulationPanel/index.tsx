"use client";
import { Panel } from "@/components/ui/Panel";
import { synthState } from "@/state/synthState";
import { useSnapshot } from "valtio";

const MOD_SOURCE_NAMES: Record<number, string> = {
  0: "LFO1",
  1: "LFO2",
  2: "AmpE",
  3: "FltE",
  4: "Vel",
  5: "Key",
  6: "M1",
  7: "M2",
  8: "M3",
  9: "M4",
  10: "Rnd",
};

const MOD_TARGET_NAMES: Record<number, string> = {
  0: "A Pitch",
  1: "A Frame",
  2: "A Warp",
  3: "A Level",
  4: "B Pitch",
  5: "B Frame",
  6: "B Warp",
  7: "B Level",
  8: "Cutoff",
  9: "Reso",
  10: "Amp",
  11: "Pan",
  12: "C Pitch",
  13: "C Frame",
  14: "C Warp",
  15: "C Level",
  16: "F2 Cutoff",
  17: "F2 Reso",
  18: "A SpMorph",
  19: "B SpMorph",
  20: "C SpMorph",
  21: "A Pan",
  22: "B Pan",
  23: "C Pan",
  24: "A UniDet",
  25: "B UniDet",
  26: "C UniDet",
  27: "A UniSpr",
  28: "B UniSpr",
  29: "C UniSpr",
  30: "F1 Drive",
  31: "F2 Drive",
  32: "F1 EnvAmt",
  33: "F2 EnvAmt",
  34: "Noise Lvl",
  35: "Sub Lvl",
  36: "A Warp2",
  37: "B Warp2",
  38: "C Warp2",
};

export function ModulationPanel() {
  const snap = useSnapshot(synthState);
  const routes = snap.modulations;

  const removeRoute = (idx: number) => {
    synthState.modulations.splice(idx, 1);
  };

  const updateAmount = (idx: number, value: number) => {
    const route = synthState.modulations[idx];
    if (route) {
      route.amount = value;
    }
  };

  return (
    <Panel title="MOD ROUTES" color="var(--accent-purple)">
      {routes.length === 0 ? (
        <div className="text-[9px] text-text-muted text-center py-2">
          Drag MOD from LFO/ENV to a knob
        </div>
      ) : (
        <div className="space-y-1 max-h-[120px] overflow-y-auto">
          {routes.map((route, idx) => (
            <div key={idx} className="flex items-center gap-1">
              <span className="text-[9px] text-lfo font-medium w-7 shrink-0">
                {MOD_SOURCE_NAMES[route.source] ?? "?"}
              </span>
              <span className="text-[8px] text-text-muted">&rarr;</span>
              <span className="text-[9px] text-text-secondary flex-1 truncate">
                {MOD_TARGET_NAMES[route.target] ?? "?"}
              </span>
              <input
                type="range"
                min={-1}
                max={1}
                step={0.01}
                value={route.amount}
                onChange={(e) => updateAmount(idx, Number(e.target.value))}
                className="w-14"
              />
              <span className="text-[8px] text-text-secondary w-7 text-right">
                {(route.amount * 100).toFixed(0)}%
              </span>
              <button
                type="button"
                onClick={() => removeRoute(idx)}
                className="text-text-muted hover:text-accent-red text-[10px] px-0.5 cursor-pointer"
              >
                x
              </button>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
