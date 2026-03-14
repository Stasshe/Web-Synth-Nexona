"use client";
import { FILTER_MODELS } from "@/audio/dsp/filter/filterRegistry";
import { ModTarget } from "@/audio/dsp/modulation/modMatrix";
import { Knob } from "@/components/ui/Knob";
import { Panel } from "@/components/ui/Panel";
import { SelectWithArrows } from "@/components/ui/SelectWithArrows";
import type { ModSourceDragItem } from "@/dnd/types";
import { useModRoutes } from "@/hooks/useModAmount";
import { synthState } from "@/state/synthState";
import { useCallback, useRef } from "react";
import { useSnapshot } from "valtio";
import { FilterResponseGraph } from "./FilterResponseGraph";

interface FilterPanelProps {
  filter?: 1 | 2;
}

/** Vital-style model colors */
const MODEL_COLORS: Record<number, string> = {
  0: "hsl(220, 80%, 65%)",   // Analog — blue
  1: "hsl(35, 85%, 60%)",    // Dirty — orange
  2: "hsl(280, 70%, 65%)",   // Ladder — purple
  3: "hsl(170, 70%, 55%)",   // Digital — teal
  4: "hsl(350, 75%, 60%)",   // Diode — red
  5: "hsl(130, 60%, 55%)",   // Formant — green
  6: "hsl(55, 80%, 55%)",    // Comb — yellow
  7: "hsl(300, 65%, 65%)",   // Phaser — pink
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

  const model = FILTER_MODELS[f.type] ?? FILTER_MODELS[0];
  const color = MODEL_COLORS[f.type] ?? MODEL_COLORS[0];

  const modelOptions = FILTER_MODELS.map((m, i) => ({ value: String(i), label: m.name }));
  const styleOptions = Array.from({ length: model.styleCount }, (_, i) => ({
    value: String(i),
    label: model.styleNames[i] ?? `Style ${i}`,
  }));

  // Blend slider drag state
  const blendSliderRef = useRef<HTMLDivElement>(null);
  const blendDragRef = useRef<{ startX: number; startBlend: number } | null>(null);

  const handleBlendPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      blendDragRef.current = { startX: e.clientX, startBlend: f.blend };
    },
    [f.blend],
  );

  const handleBlendPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!blendDragRef.current) return;
      const dx = e.clientX - blendDragRef.current.startX;
      const rect = blendSliderRef.current?.getBoundingClientRect();
      const width = rect?.width ?? 200;
      const newBlend = Math.min(1, Math.max(-1, blendDragRef.current.startBlend + (dx / width) * 2));
      state.blend = newBlend;
    },
    [state],
  );

  const handleBlendPointerUp = useCallback(() => {
    blendDragRef.current = null;
  }, []);

  const handleBlendClick = useCallback(
    (e: React.MouseEvent) => {
      if (blendDragRef.current) return;
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const relX = (e.clientX - rect.left) / rect.width;
      state.blend = Math.min(1, Math.max(-1, relX * 2 - 1));
    },
    [state],
  );

  // Blend position in [0,1] for CSS
  const blendPct = ((f.blend + 1) / 2) * 100;

  return (
    <Panel
      title={`FILTER ${filter}`}
      color={color}
      onToggle={() => (state.on = !state.on)}
      enabled={f.on}
    >
      {/* Interactive frequency response graph */}
      <div className="mb-1.5 relative">
        <FilterResponseGraph
          modelIndex={f.type}
          style={f.style}
          cutoff={f.cutoff}
          resonance={f.resonance}
          blend={f.blend}
          color={color}
          onCutoffChange={(v) => (state.cutoff = v)}
          onResonanceChange={(v) => (state.resonance = v)}
          width={240}
          height={80}
        />
      </div>

      {/* Model selector */}
      <SelectWithArrows
        value={String(f.type)}
        options={modelOptions}
        onChange={(v) => {
          const newModel = Number(v);
          state.type = newModel;
          // Reset style if out of range for new model
          const newModelDef = FILTER_MODELS[newModel];
          if (newModelDef && f.style >= newModelDef.styleCount) {
            state.style = 0;
          }
        }}
        accentColor={color}
        className="mb-0.5"
      />

      {/* Style selector */}
      {model.styleCount > 1 && (
        <SelectWithArrows
          value={String(f.style)}
          options={styleOptions}
          onChange={(v) => (state.style = Number(v))}
          accentColor={color}
          className="mb-1.5"
        />
      )}

      {/* Blend slider: LP ← BP → HP (Vital core feature) */}
      <div className="mb-1.5">
        <div className="flex justify-between text-[8px] text-text-muted mb-0.5 px-0.5">
          <span>LP</span>
          <span style={{ color }}>BLEND</span>
          <span>HP</span>
        </div>
        <div
          ref={blendSliderRef}
          className="relative h-4 rounded cursor-ew-resize touch-none select-none"
          style={{
            background: `linear-gradient(to right, hsl(220,70%,40%), ${color}, hsl(30,80%,55%))`,
            opacity: f.on ? 1 : 0.5,
          }}
          onPointerDown={handleBlendPointerDown}
          onPointerMove={handleBlendPointerMove}
          onPointerUp={handleBlendPointerUp}
          onClick={handleBlendClick}
        >
          {/* Track fill: from center to handle */}
          <div
            className="absolute inset-y-0 left-1/2 pointer-events-none rounded-r"
            style={{
              right: blendPct < 50 ? `${100 - blendPct}%` : undefined,
              left: blendPct >= 50 ? "50%" : undefined,
              width: blendPct < 50 ? `${50 - blendPct}%` : `${blendPct - 50}%`,
              background: "rgba(255,255,255,0.15)",
            }}
          />
          {/* Center notch */}
          <div
            className="absolute inset-y-1 w-px pointer-events-none"
            style={{ left: "50%", background: "rgba(255,255,255,0.3)" }}
          />
          {/* Handle */}
          <div
            className="absolute top-0.5 bottom-0.5 w-2.5 -translate-x-1/2 rounded-sm pointer-events-none"
            style={{
              left: `${blendPct}%`,
              background: "rgba(255,255,255,0.9)",
              boxShadow: `0 0 4px ${color}`,
            }}
          />
          {/* Label at handle */}
          <div
            className="absolute -bottom-3 text-[7px] -translate-x-1/2 pointer-events-none"
            style={{ left: `${blendPct}%`, color: "rgba(255,255,255,0.5)" }}
          >
            {f.blend === 0 ? "BP" : f.blend < 0 ? `LP${Math.abs(f.blend) > 0.5 ? "" : "·BP"}` : `HP${f.blend > 0.5 ? "" : "·BP"}`}
          </div>
        </div>
        <div className="h-3" /> {/* spacer for label */}
      </div>

      {/* Knobs: Cutoff, Reso, Drive, Env */}
      <div className="grid grid-cols-4 gap-1 mb-1">
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

      {/* Input source routing */}
      <div className="flex gap-0.5">
        <span className="text-[8px] text-text-muted mr-0.5 self-center">IN</span>
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
                  ? `color-mix(in srgb, ${color} 20%, transparent)`
                  : "transparent",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
    </Panel>
  );
}
