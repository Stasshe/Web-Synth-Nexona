"use client";
import { Knob } from "@/components/ui/Knob";
import { Panel } from "@/components/ui/Panel";
import { synthState } from "@/state/synthState";
import { useState } from "react";
import { useSnapshot } from "valtio";

type EffectTab = "chorus" | "delay" | "reverb";

export function EffectsPanel() {
  const snap = useSnapshot(synthState);
  const [tab, setTab] = useState<EffectTab>("chorus");

  return (
    <Panel title="EFFECTS" color="var(--effects)">
      <div className="flex gap-1 mb-3">
        {(["chorus", "delay", "reverb"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 text-[10px] py-1 rounded border transition-colors ${
              tab === t
                ? "border-effects text-effects"
                : "bg-transparent border-border-default text-text-muted"
            }`}
            style={tab === t ? { backgroundColor: "rgba(68,204,204,0.15)" } : undefined}
          >
            {t.toUpperCase()}
          </button>
        ))}
      </div>

      {tab === "chorus" && (
        <div className="grid grid-cols-3 gap-2">
          <Knob
            label="Rate"
            value={snap.effects.chorus.rate}
            min={0.1}
            max={5}
            step={0.01}
            onChange={(v) => (synthState.effects.chorus.rate = v)}
            color="var(--effects)"
            formatValue={(v) => `${v.toFixed(1)}Hz`}
          />
          <Knob
            label="Depth"
            value={snap.effects.chorus.depth}
            min={0}
            max={1}
            onChange={(v) => (synthState.effects.chorus.depth = v)}
            color="var(--effects)"
          />
          <Knob
            label="Mix"
            value={snap.effects.chorus.mix}
            min={0}
            max={1}
            onChange={(v) => (synthState.effects.chorus.mix = v)}
            color="var(--effects)"
          />
        </div>
      )}

      {tab === "delay" && (
        <div className="grid grid-cols-3 gap-2">
          <Knob
            label="Time"
            value={snap.effects.delay.time}
            min={0.01}
            max={2}
            step={0.01}
            onChange={(v) => (synthState.effects.delay.time = v)}
            color="var(--effects)"
            formatValue={(v) => `${(v * 1000).toFixed(0)}ms`}
          />
          <Knob
            label="Feedback"
            value={snap.effects.delay.feedback}
            min={0}
            max={0.95}
            onChange={(v) => (synthState.effects.delay.feedback = v)}
            color="var(--effects)"
          />
          <Knob
            label="Mix"
            value={snap.effects.delay.mix}
            min={0}
            max={1}
            onChange={(v) => (synthState.effects.delay.mix = v)}
            color="var(--effects)"
          />
        </div>
      )}

      {tab === "reverb" && (
        <div className="grid grid-cols-2 gap-2">
          <Knob
            label="Decay"
            value={snap.effects.reverb.decay}
            min={0.1}
            max={0.99}
            onChange={(v) => (synthState.effects.reverb.decay = v)}
            color="var(--effects)"
          />
          <Knob
            label="Mix"
            value={snap.effects.reverb.mix}
            min={0}
            max={1}
            onChange={(v) => (synthState.effects.reverb.mix = v)}
            color="var(--effects)"
          />
        </div>
      )}
    </Panel>
  );
}
