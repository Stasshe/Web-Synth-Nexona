"use client";
import { ModTarget } from "@/audio/dsp/modulation/modMatrix";
import { Knob } from "@/components/ui/Knob";
import { Panel } from "@/components/ui/Panel";
import type { ModSourceDragItem } from "@/dnd/types";
import { useModRoutes } from "@/hooks/useModAmount";
import { synthState } from "@/state/synthState";
import { useCallback } from "react";
import { useSnapshot } from "valtio";

const DIST_MODES = ["Soft", "Hard", "Fold", "Bits"];

function useEffectsModDrop() {
  return useCallback(
    (target: ModTarget) => (item: ModSourceDragItem) => {
      synthState.modulations.push({ source: item.source, target, amount: 0.5 });
    },
    [],
  );
}

function DistortionSlot() {
  const snap = useSnapshot(synthState);
  const d = snap.effects.distortion;
  const enabled = d.mix > 0;
  const handleModDrop = useEffectsModDrop();
  const modDrive = useModRoutes(ModTarget.DIST_DRIVE);
  const modMix = useModRoutes(ModTarget.DIST_MIX);
  return (
    <Panel
      title="DISTORTION"
      color="var(--effects)"
      onToggle={() => (synthState.effects.distortion.mix = enabled ? 0 : 0.5)}
      enabled={enabled}
    >
      <div className="flex gap-0.5 mb-1">
        {DIST_MODES.map((m, i) => (
          <button
            key={m}
            type="button"
            onClick={() => (synthState.effects.distortion.mode = i)}
            className="flex-1 text-[8px] py-0.5 rounded border cursor-pointer"
            style={{
              borderColor: d.mode === i ? "var(--effects)" : "var(--border)",
              color: d.mode === i ? "var(--effects)" : "var(--text-muted)",
              backgroundColor:
                d.mode === i
                  ? "color-mix(in srgb, var(--effects) 15%, transparent)"
                  : "transparent",
            }}
          >
            {m}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-1">
        <Knob
          label="Drive"
          value={d.drive}
          min={1}
          max={20}
          step={0.1}
          onChange={(v) => (synthState.effects.distortion.drive = v)}
          color="var(--effects)"
          formatValue={(v) => `${v.toFixed(1)}x`}
          size={32}
          modRoutes={modDrive}
          onModDrop={handleModDrop(ModTarget.DIST_DRIVE)}
          modTarget={ModTarget.DIST_DRIVE}
        />
        <Knob
          label="Tone"
          value={d.tone}
          min={0}
          max={1}
          onChange={(v) => (synthState.effects.distortion.tone = v)}
          color="var(--effects)"
          size={32}
        />
        <Knob
          label="Mix"
          value={d.mix}
          min={0}
          max={1}
          onChange={(v) => (synthState.effects.distortion.mix = v)}
          color="var(--effects)"
          size={32}
          modRoutes={modMix}
          onModDrop={handleModDrop(ModTarget.DIST_MIX)}
          modTarget={ModTarget.DIST_MIX}
        />
      </div>
    </Panel>
  );
}

function CompressorSlot() {
  const snap = useSnapshot(synthState);
  const c = snap.effects.compressor;
  const enabled = c.mix > 0;
  return (
    <Panel
      title="COMPRESSOR"
      color="var(--effects)"
      onToggle={() => (synthState.effects.compressor.mix = enabled ? 0 : 1)}
      enabled={enabled}
    >
      <div className="grid grid-cols-3 gap-1">
        <Knob
          label="Thresh"
          value={c.threshold}
          min={-60}
          max={0}
          step={0.5}
          onChange={(v) => (synthState.effects.compressor.threshold = v)}
          color="var(--effects)"
          formatValue={(v) => `${v.toFixed(0)}dB`}
          size={32}
        />
        <Knob
          label="Ratio"
          value={c.ratio}
          min={1}
          max={20}
          step={0.5}
          onChange={(v) => (synthState.effects.compressor.ratio = v)}
          color="var(--effects)"
          formatValue={(v) => `${v.toFixed(1)}:1`}
          size={32}
        />
        <Knob
          label="Makeup"
          value={c.makeup}
          min={0}
          max={24}
          step={0.5}
          onChange={(v) => (synthState.effects.compressor.makeup = v)}
          color="var(--effects)"
          formatValue={(v) => `+${v.toFixed(0)}dB`}
          size={32}
        />
        <Knob
          label="Atk"
          value={c.attack}
          min={0.001}
          max={0.5}
          step={0.001}
          onChange={(v) => (synthState.effects.compressor.attack = v)}
          color="var(--effects)"
          formatValue={(v) => `${(v * 1000).toFixed(0)}ms`}
          size={32}
        />
        <Knob
          label="Rel"
          value={c.release}
          min={0.01}
          max={2}
          step={0.01}
          onChange={(v) => (synthState.effects.compressor.release = v)}
          color="var(--effects)"
          formatValue={(v) => `${(v * 1000).toFixed(0)}ms`}
          size={32}
        />
        <Knob
          label="Mix"
          value={c.mix}
          min={0}
          max={1}
          onChange={(v) => (synthState.effects.compressor.mix = v)}
          color="var(--effects)"
          size={32}
        />
      </div>
    </Panel>
  );
}

function ChorusSlot() {
  const snap = useSnapshot(synthState);
  const c = snap.effects.chorus;
  const enabled = c.mix > 0;
  const handleModDrop = useEffectsModDrop();
  const modRate = useModRoutes(ModTarget.CHORUS_RATE);
  const modDepth = useModRoutes(ModTarget.CHORUS_DEPTH);
  const modMix = useModRoutes(ModTarget.CHORUS_MIX);
  return (
    <Panel
      title="CHORUS"
      color="var(--effects)"
      onToggle={() => (synthState.effects.chorus.mix = enabled ? 0 : 0.4)}
      enabled={enabled}
    >
      <div className="grid grid-cols-3 gap-1">
        <Knob
          label="Rate"
          value={c.rate}
          min={0.1}
          max={5}
          step={0.01}
          onChange={(v) => (synthState.effects.chorus.rate = v)}
          color="var(--effects)"
          formatValue={(v) => `${v.toFixed(1)}Hz`}
          size={32}
          modRoutes={modRate}
          onModDrop={handleModDrop(ModTarget.CHORUS_RATE)}
          modTarget={ModTarget.CHORUS_RATE}
        />
        <Knob
          label="Depth"
          value={c.depth}
          min={0}
          max={1}
          onChange={(v) => (synthState.effects.chorus.depth = v)}
          color="var(--effects)"
          size={32}
          modRoutes={modDepth}
          onModDrop={handleModDrop(ModTarget.CHORUS_DEPTH)}
          modTarget={ModTarget.CHORUS_DEPTH}
        />
        <Knob
          label="Mix"
          value={c.mix}
          min={0}
          max={1}
          onChange={(v) => (synthState.effects.chorus.mix = v)}
          color="var(--effects)"
          size={32}
          modRoutes={modMix}
          onModDrop={handleModDrop(ModTarget.CHORUS_MIX)}
          modTarget={ModTarget.CHORUS_MIX}
        />
      </div>
    </Panel>
  );
}

function FlangerSlot() {
  const snap = useSnapshot(synthState);
  const f = snap.effects.flanger;
  const enabled = f.mix > 0;
  const handleModDrop = useEffectsModDrop();
  const modRate = useModRoutes(ModTarget.FLANGER_RATE);
  const modDepth = useModRoutes(ModTarget.FLANGER_DEPTH);
  const modFeedback = useModRoutes(ModTarget.FLANGER_FEEDBACK);
  const modMix = useModRoutes(ModTarget.FLANGER_MIX);
  return (
    <Panel
      title="FLANGER"
      color="var(--effects)"
      onToggle={() => (synthState.effects.flanger.mix = enabled ? 0 : 0.5)}
      enabled={enabled}
    >
      <div className="grid grid-cols-2 gap-1">
        <Knob
          label="Rate"
          value={f.rate}
          min={0.01}
          max={10}
          step={0.01}
          onChange={(v) => (synthState.effects.flanger.rate = v)}
          color="var(--effects)"
          formatValue={(v) => `${v.toFixed(2)}Hz`}
          size={32}
          modRoutes={modRate}
          onModDrop={handleModDrop(ModTarget.FLANGER_RATE)}
          modTarget={ModTarget.FLANGER_RATE}
        />
        <Knob
          label="Depth"
          value={f.depth}
          min={0}
          max={1}
          onChange={(v) => (synthState.effects.flanger.depth = v)}
          color="var(--effects)"
          size={32}
          modRoutes={modDepth}
          onModDrop={handleModDrop(ModTarget.FLANGER_DEPTH)}
          modTarget={ModTarget.FLANGER_DEPTH}
        />
        <Knob
          label="Fdbk"
          value={f.feedback}
          min={0}
          max={0.95}
          onChange={(v) => (synthState.effects.flanger.feedback = v)}
          color="var(--effects)"
          size={32}
          modRoutes={modFeedback}
          onModDrop={handleModDrop(ModTarget.FLANGER_FEEDBACK)}
          modTarget={ModTarget.FLANGER_FEEDBACK}
        />
        <Knob
          label="Mix"
          value={f.mix}
          min={0}
          max={1}
          onChange={(v) => (synthState.effects.flanger.mix = v)}
          color="var(--effects)"
          size={32}
          modRoutes={modMix}
          onModDrop={handleModDrop(ModTarget.FLANGER_MIX)}
          modTarget={ModTarget.FLANGER_MIX}
        />
      </div>
    </Panel>
  );
}

function PhaserSlot() {
  const snap = useSnapshot(synthState);
  const p = snap.effects.phaser;
  const enabled = p.mix > 0;
  const handleModDrop = useEffectsModDrop();
  const modRate = useModRoutes(ModTarget.PHASER_RATE);
  const modDepth = useModRoutes(ModTarget.PHASER_DEPTH);
  const modFeedback = useModRoutes(ModTarget.PHASER_FEEDBACK);
  const modMix = useModRoutes(ModTarget.PHASER_MIX);
  return (
    <Panel
      title="PHASER"
      color="var(--effects)"
      onToggle={() => (synthState.effects.phaser.mix = enabled ? 0 : 0.5)}
      enabled={enabled}
    >
      <div className="grid grid-cols-2 gap-1">
        <Knob
          label="Rate"
          value={p.rate}
          min={0.01}
          max={10}
          step={0.01}
          onChange={(v) => (synthState.effects.phaser.rate = v)}
          color="var(--effects)"
          formatValue={(v) => `${v.toFixed(2)}Hz`}
          size={32}
          modRoutes={modRate}
          onModDrop={handleModDrop(ModTarget.PHASER_RATE)}
          modTarget={ModTarget.PHASER_RATE}
        />
        <Knob
          label="Depth"
          value={p.depth}
          min={0}
          max={1}
          onChange={(v) => (synthState.effects.phaser.depth = v)}
          color="var(--effects)"
          size={32}
          modRoutes={modDepth}
          onModDrop={handleModDrop(ModTarget.PHASER_DEPTH)}
          modTarget={ModTarget.PHASER_DEPTH}
        />
        <Knob
          label="Fdbk"
          value={p.feedback}
          min={0}
          max={0.95}
          onChange={(v) => (synthState.effects.phaser.feedback = v)}
          color="var(--effects)"
          size={32}
          modRoutes={modFeedback}
          onModDrop={handleModDrop(ModTarget.PHASER_FEEDBACK)}
          modTarget={ModTarget.PHASER_FEEDBACK}
        />
        <Knob
          label="Mix"
          value={p.mix}
          min={0}
          max={1}
          onChange={(v) => (synthState.effects.phaser.mix = v)}
          color="var(--effects)"
          size={32}
          modRoutes={modMix}
          onModDrop={handleModDrop(ModTarget.PHASER_MIX)}
          modTarget={ModTarget.PHASER_MIX}
        />
      </div>
    </Panel>
  );
}

function DelaySlot() {
  const snap = useSnapshot(synthState);
  const d = snap.effects.delay;
  const enabled = d.mix > 0;
  const handleModDrop = useEffectsModDrop();
  const modTime = useModRoutes(ModTarget.DELAY_TIME);
  const modFeedback = useModRoutes(ModTarget.DELAY_FEEDBACK);
  const modMix = useModRoutes(ModTarget.DELAY_MIX);
  return (
    <Panel
      title="DELAY"
      color="var(--effects)"
      onToggle={() => (synthState.effects.delay.mix = enabled ? 0 : 0.3)}
      enabled={enabled}
    >
      <div className="grid grid-cols-3 gap-1">
        <Knob
          label="Time"
          value={d.time}
          min={0.01}
          max={2}
          step={0.01}
          onChange={(v) => (synthState.effects.delay.time = v)}
          color="var(--effects)"
          formatValue={(v) => `${(v * 1000).toFixed(0)}ms`}
          size={32}
          modRoutes={modTime}
          onModDrop={handleModDrop(ModTarget.DELAY_TIME)}
          modTarget={ModTarget.DELAY_TIME}
        />
        <Knob
          label="Fdbk"
          value={d.feedback}
          min={0}
          max={0.95}
          onChange={(v) => (synthState.effects.delay.feedback = v)}
          color="var(--effects)"
          size={32}
          modRoutes={modFeedback}
          onModDrop={handleModDrop(ModTarget.DELAY_FEEDBACK)}
          modTarget={ModTarget.DELAY_FEEDBACK}
        />
        <Knob
          label="Mix"
          value={d.mix}
          min={0}
          max={1}
          onChange={(v) => (synthState.effects.delay.mix = v)}
          color="var(--effects)"
          size={32}
          modRoutes={modMix}
          onModDrop={handleModDrop(ModTarget.DELAY_MIX)}
          modTarget={ModTarget.DELAY_MIX}
        />
      </div>
    </Panel>
  );
}

function ReverbSlot() {
  const snap = useSnapshot(synthState);
  const r = snap.effects.reverb;
  const enabled = r.mix > 0;
  const handleModDrop = useEffectsModDrop();
  const modDecay = useModRoutes(ModTarget.REVERB_DECAY);
  const modMix = useModRoutes(ModTarget.REVERB_MIX);
  return (
    <Panel
      title="REVERB"
      color="var(--effects)"
      onToggle={() => (synthState.effects.reverb.mix = enabled ? 0 : 0.3)}
      enabled={enabled}
    >
      <div className="grid grid-cols-2 gap-1">
        <Knob
          label="Decay"
          value={r.decay}
          min={0.1}
          max={0.99}
          onChange={(v) => (synthState.effects.reverb.decay = v)}
          color="var(--effects)"
          size={32}
          modRoutes={modDecay}
          onModDrop={handleModDrop(ModTarget.REVERB_DECAY)}
          modTarget={ModTarget.REVERB_DECAY}
        />
        <Knob
          label="Mix"
          value={r.mix}
          min={0}
          max={1}
          onChange={(v) => (synthState.effects.reverb.mix = v)}
          color="var(--effects)"
          size={32}
          modRoutes={modMix}
          onModDrop={handleModDrop(ModTarget.REVERB_MIX)}
          modTarget={ModTarget.REVERB_MIX}
        />
      </div>
    </Panel>
  );
}

function EQSlot() {
  const snap = useSnapshot(synthState);
  const eq = snap.effects.eq;
  const enabled = eq.mix > 0;
  const handleModDrop = useEffectsModDrop();
  const modLow = useModRoutes(ModTarget.EQ_LOW);
  const modMid = useModRoutes(ModTarget.EQ_MID);
  const modHigh = useModRoutes(ModTarget.EQ_HIGH);
  return (
    <Panel
      title="EQ"
      color="var(--effects)"
      onToggle={() => (synthState.effects.eq.mix = enabled ? 0 : 1)}
      enabled={enabled}
    >
      <div className="grid grid-cols-4 gap-1">
        <Knob
          label="Low"
          value={eq.lowGain}
          min={-12}
          max={12}
          step={0.5}
          onChange={(v) => (synthState.effects.eq.lowGain = v)}
          color="var(--effects)"
          formatValue={(v) => `${v > 0 ? "+" : ""}${v.toFixed(0)}dB`}
          size={32}
          modRoutes={modLow}
          onModDrop={handleModDrop(ModTarget.EQ_LOW)}
          modTarget={ModTarget.EQ_LOW}
        />
        <Knob
          label="Mid"
          value={eq.midGain}
          min={-12}
          max={12}
          step={0.5}
          onChange={(v) => (synthState.effects.eq.midGain = v)}
          color="var(--effects)"
          formatValue={(v) => `${v > 0 ? "+" : ""}${v.toFixed(0)}dB`}
          size={32}
          modRoutes={modMid}
          onModDrop={handleModDrop(ModTarget.EQ_MID)}
          modTarget={ModTarget.EQ_MID}
        />
        <Knob
          label="High"
          value={eq.highGain}
          min={-12}
          max={12}
          step={0.5}
          onChange={(v) => (synthState.effects.eq.highGain = v)}
          color="var(--effects)"
          formatValue={(v) => `${v > 0 ? "+" : ""}${v.toFixed(0)}dB`}
          size={32}
          modRoutes={modHigh}
          onModDrop={handleModDrop(ModTarget.EQ_HIGH)}
          modTarget={ModTarget.EQ_HIGH}
        />
        <Knob
          label="Mix"
          value={eq.mix}
          min={0}
          max={1}
          onChange={(v) => (synthState.effects.eq.mix = v)}
          color="var(--effects)"
          size={32}
        />
      </div>
    </Panel>
  );
}

export function EffectsPage() {
  return (
    <div className="grid grid-cols-3 gap-1 content-start">
      <DistortionSlot />
      <CompressorSlot />
      <ChorusSlot />
      <FlangerSlot />
      <PhaserSlot />
      <DelaySlot />
      <ReverbSlot />
      <EQSlot />
    </div>
  );
}
