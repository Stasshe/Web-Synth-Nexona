"use client";
import { ModTarget } from "@/audio/dsp/modulation/modMatrix";
import { SPECTRAL_MORPH_NAMES } from "@/audio/dsp/spectralMorph/spectralMorphTypes";
import { PRESET_COUNT, PRESET_NAMES } from "@/audio/dsp/wavetable/wavetablePresets";
import { computeMorphedPreviewSamples } from "@/audio/dsp/wavetable/wavetablePreview";
import { Knob } from "@/components/ui/Knob";
import { Panel } from "@/components/ui/Panel";
import { SelectPopup } from "@/components/ui/SelectPopup";
import { SelectWithArrows } from "@/components/ui/SelectWithArrows";
import type { ModSourceDragItem } from "@/dnd/types";
import { useModRoutes } from "@/hooks/useModAmount";
import { synthState } from "@/state/synthState";
import { Pencil } from "lucide-react";
import { useCallback, useMemo } from "react";
import { useSnapshot } from "valtio";

const WARP_OPTIONS = [
  { value: "0", label: "None" },
  { value: "1", label: "Bend" },
  { value: "2", label: "Sync" },
  { value: "3", label: "PD" },
  { value: "4", label: "Mirror" },
  { value: "5", label: "Quantize" },
  { value: "6", label: "FM 2:1" },
  { value: "7", label: "Formant" },
  { value: "8", label: "Squeeze" },
  { value: "9", label: "PW" },
  { value: "10", label: "FM 1:1" },
  { value: "11", label: "FM 3:1" },
  { value: "12", label: "FM 4:1" },
];

const SPECTRAL_MORPH_OPTIONS = Object.entries(SPECTRAL_MORPH_NAMES).map(([value, label]) => ({
  value,
  label,
}));

const PRESET_OPTIONS = Array.from({ length: PRESET_COUNT }, (_, i) => ({
  value: String(i),
  label: PRESET_NAMES[i],
}));

interface OscillatorPanelProps {
  osc: "a" | "b" | "c";
  onOpenWaveEditor?: () => void;
}

const OSC_COLORS: Record<string, string> = {
  a: "var(--osc-a)",
  b: "var(--osc-b)",
  c: "var(--osc-c)",
};

const OSC_MOD_TARGETS: Record<
  string,
  {
    level: ModTarget;
    frame: ModTarget;
    warp: ModTarget;
    warp2: ModTarget;
    pitch: ModTarget;
    spectralMorph: ModTarget;
    pan: ModTarget;
    unisonDetune: ModTarget;
    unisonSpread: ModTarget;
  }
> = {
  a: {
    level: ModTarget.OSC_A_LEVEL,
    frame: ModTarget.OSC_A_FRAME,
    warp: ModTarget.OSC_A_WARP_AMOUNT,
    warp2: ModTarget.OSC_A_WARP2_AMOUNT,
    pitch: ModTarget.OSC_A_PITCH,
    spectralMorph: ModTarget.OSC_A_SPECTRAL_MORPH,
    pan: ModTarget.OSC_A_PAN,
    unisonDetune: ModTarget.OSC_A_UNISON_DETUNE,
    unisonSpread: ModTarget.OSC_A_UNISON_SPREAD,
  },
  b: {
    level: ModTarget.OSC_B_LEVEL,
    frame: ModTarget.OSC_B_FRAME,
    warp: ModTarget.OSC_B_WARP_AMOUNT,
    warp2: ModTarget.OSC_B_WARP2_AMOUNT,
    pitch: ModTarget.OSC_B_PITCH,
    spectralMorph: ModTarget.OSC_B_SPECTRAL_MORPH,
    pan: ModTarget.OSC_B_PAN,
    unisonDetune: ModTarget.OSC_B_UNISON_DETUNE,
    unisonSpread: ModTarget.OSC_B_UNISON_SPREAD,
  },
  c: {
    level: ModTarget.OSC_C_LEVEL,
    frame: ModTarget.OSC_C_FRAME,
    warp: ModTarget.OSC_C_WARP_AMOUNT,
    warp2: ModTarget.OSC_C_WARP2_AMOUNT,
    pitch: ModTarget.OSC_C_PITCH,
    spectralMorph: ModTarget.OSC_C_SPECTRAL_MORPH,
    pan: ModTarget.OSC_C_PAN,
    unisonDetune: ModTarget.OSC_C_UNISON_DETUNE,
    unisonSpread: ModTarget.OSC_C_UNISON_SPREAD,
  },
};

function WaveformPreview({
  waveformType,
  framePosition,
  customWaveform,
  color,
  spectralMorphType,
  spectralMorphAmount,
  onClick,
}: {
  waveformType: number;
  framePosition: number;
  customWaveform: readonly number[] | null;
  color: string;
  spectralMorphType: number;
  spectralMorphAmount: number;
  onClick?: () => void;
}) {
  const samples = useMemo(
    () =>
      computeMorphedPreviewSamples(
        waveformType,
        framePosition,
        customWaveform,
        spectralMorphType,
        spectralMorphAmount,
      ),
    [waveformType, framePosition, customWaveform, spectralMorphType, spectralMorphAmount],
  );

  const ghostFrames = useMemo(() => {
    if (waveformType < 0 || (customWaveform && customWaveform.length > 1)) return [];
    const ghosts: { points: string; opacity: number; offsetY: number }[] = [];
    const offsets = [-0.15, -0.08, 0.08, 0.15];
    for (const off of offsets) {
      const fp = Math.max(0, Math.min(1, framePosition + off));
      const s = computeMorphedPreviewSamples(
        waveformType,
        fp,
        null,
        spectralMorphType,
        spectralMorphAmount,
      );
      const ghostH = 64;
      const pts: string[] = [];
      for (let i = 0; i < s.length; i++) {
        pts.push(`${i},${((-s[i] + 1) * ghostH) / 2 + Math.abs(off) * 40}`);
      }
      ghosts.push({ points: pts.join(" "), opacity: 0.15, offsetY: off * 20 });
    }
    return ghosts;
  }, [waveformType, framePosition, customWaveform, spectralMorphType, spectralMorphAmount]);

  const W = 128;
  const H = 80;
  const pts: string[] = [];
  for (let i = 0; i < samples.length; i++) {
    pts.push(`${i},${((-samples[i] + 1) * (H - 16)) / 2 + 8}`);
  }
  const points = pts.join(" ");

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: SVG waveform preview acts as visual click target
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full cursor-pointer rounded"
      style={{
        height: 80,
        background: "color-mix(in srgb, var(--bg-darkest) 60%, transparent)",
      }}
      onClick={onClick}
    >
      <title>Click to edit waveform</title>
      {ghostFrames.map((g, idx) => (
        <polyline
          key={idx}
          points={g.points}
          fill="none"
          stroke={color}
          strokeWidth="0.8"
          opacity={g.opacity}
          transform={`translate(0,${g.offsetY})`}
        />
      ))}
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.9"
      />
    </svg>
  );
}

export function OscillatorPanel({ osc, onOpenWaveEditor }: OscillatorPanelProps) {
  const snap = useSnapshot(synthState);
  const data = snap.oscillators[osc];
  const state = synthState.oscillators[osc];
  const color = OSC_COLORS[osc];
  const targets = OSC_MOD_TARGETS[osc];
  const modLevel = useModRoutes(targets.level);
  const modWarp = useModRoutes(targets.warp);
  const modWarp2 = useModRoutes(targets.warp2);
  const modPitch = useModRoutes(targets.pitch);
  const modSpectralMorph = useModRoutes(targets.spectralMorph);
  const modPan = useModRoutes(targets.pan);
  const modUnisonDetune = useModRoutes(targets.unisonDetune);
  const modUnisonSpread = useModRoutes(targets.unisonSpread);
  const modFrame = useModRoutes(targets.frame);

  const handleModDrop = useCallback(
    (target: ModTarget) => (item: ModSourceDragItem) => {
      synthState.modulations.push({ source: item.source, target, amount: 0.5 });
    },
    [],
  );

  return (
    <Panel
      title={`OSC ${osc.toUpperCase()}`}
      color={color}
      onToggle={() => (state.on = !state.on)}
      enabled={data.on}
    >
      {/* Large waveform display */}
      <div className="mb-1">
        <WaveformPreview
          waveformType={data.waveformType}
          framePosition={data.framePosition}
          customWaveform={data.customWaveform}
          color={color}
          spectralMorphType={data.spectralMorphType}
          spectralMorphAmount={data.spectralMorphAmount}
        />
      </div>

      {/* Preset selector */}
      <div className="flex items-center gap-1 mb-1">
        <SelectWithArrows
          value={String(data.waveformType)}
          displayLabel={data.waveformType === -1 ? "Custom" : undefined}
          options={PRESET_OPTIONS}
          onChange={(v) => {
            const idx = Number(v);
            state.waveformType = idx;
            state.waveformName = PRESET_NAMES[idx] ?? "Custom";
            state.customWaveform = null;
            state.controlPoints = null;
          }}
          accentColor={color}
          className="flex-1"
        />
        <button
          type="button"
          onClick={onOpenWaveEditor}
          className="px-1 py-0.5 text-text-secondary hover:text-text-primary bg-bg-surface border border-border-default rounded cursor-pointer transition-colors"
          title="Edit waveform"
        >
          <Pencil size={10} />
        </button>
      </div>

      {/* Frame position */}
      <div className="mb-1.5 px-0.5 flex items-center gap-1">
        <Knob
          label="Pos"
          value={data.framePosition}
          min={0}
          max={1}
          onChange={(v) => (state.framePosition = v)}
          color={color}
          modRoutes={modFrame}
          onModDrop={handleModDrop(targets.frame)}
          modTarget={targets.frame}
          size={24}
          formatValue={(v) => `${Math.round(v * 63)}`}
        />
        <input
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={data.framePosition}
          onChange={(e) => (state.framePosition = Number(e.target.value))}
          className="flex-1 h-1.5 rounded appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, ${color} ${data.framePosition * 100}%, var(--bg-darkest) ${data.framePosition * 100}%)`,
            accentColor: color,
          }}
          title={`Frame: ${Math.round(data.framePosition * 63)}`}
        />
      </div>

      {/* Spectral Morph + Distortion row */}
      <div className="grid grid-cols-3 gap-1 mb-1.5">
        <div>
          <div className="text-[8px] text-text-secondary mb-0.5 uppercase tracking-wider">
            Spectral
          </div>
          <SelectPopup
            value={String(data.spectralMorphType)}
            options={SPECTRAL_MORPH_OPTIONS}
            onChange={(v) => (state.spectralMorphType = Number(v))}
          />
          <div className="mt-1 flex justify-center">
            <Knob
              label="Amt"
              value={data.spectralMorphAmount}
              min={0}
              max={1}
              onChange={(v) => (state.spectralMorphAmount = v)}
              color={color}
              modRoutes={modSpectralMorph}
              onModDrop={handleModDrop(targets.spectralMorph)}
              modTarget={targets.spectralMorph}
              size={28}
            />
          </div>
        </div>
        <div>
          <div className="text-[8px] text-text-secondary mb-0.5 uppercase tracking-wider">
            Warp 1
          </div>
          <SelectPopup
            value={String(data.warpType)}
            options={WARP_OPTIONS}
            onChange={(v) => (state.warpType = Number(v))}
          />
          <div className="mt-1 flex justify-center">
            <Knob
              label="Amt"
              value={data.warpAmount}
              min={0}
              max={1}
              onChange={(v) => (state.warpAmount = v)}
              color={color}
              modRoutes={modWarp}
              onModDrop={handleModDrop(targets.warp)}
              modTarget={targets.warp}
              size={28}
            />
          </div>
        </div>
        <div>
          <div className="text-[8px] text-text-secondary mb-0.5 uppercase tracking-wider">
            Warp 2
          </div>
          <SelectPopup
            value={String(data.warp2Type)}
            options={WARP_OPTIONS}
            onChange={(v) => (state.warp2Type = Number(v))}
          />
          <div className="mt-1 flex justify-center">
            <Knob
              label="Amt"
              value={data.warp2Amount}
              min={0}
              max={1}
              onChange={(v) => (state.warp2Amount = v)}
              color={color}
              modRoutes={modWarp2}
              onModDrop={handleModDrop(targets.warp2)}
              modTarget={targets.warp2}
              size={28}
            />
          </div>
        </div>
      </div>

      {/* Pitch + Unison row */}
      <div className="grid grid-cols-6 gap-1 mb-1">
        <Knob
          label="Oct"
          value={data.octave}
          min={-4}
          max={4}
          step={1}
          onChange={(v) => (state.octave = Math.round(v))}
          color={color}
          formatValue={(v) => `${v > 0 ? "+" : ""}${v.toFixed(0)}`}
          size={28}
        />
        <Knob
          label="Semi"
          value={data.semitone}
          min={-12}
          max={12}
          step={1}
          onChange={(v) => (state.semitone = Math.round(v))}
          color={color}
          formatValue={(v) => `${v > 0 ? "+" : ""}${v.toFixed(0)}`}
          size={28}
        />
        <Knob
          label="Fine"
          value={data.detune}
          min={-100}
          max={100}
          step={1}
          onChange={(v) => (state.detune = v)}
          color={color}
          modRoutes={modPitch}
          onModDrop={handleModDrop(targets.pitch)}
          modTarget={targets.pitch}
          formatValue={(v) => `${v > 0 ? "+" : ""}${v.toFixed(0)}ct`}
          size={28}
        />
        <Knob
          label="Uni"
          value={data.unisonVoices}
          min={1}
          max={16}
          step={1}
          onChange={(v) => (state.unisonVoices = v)}
          color={color}
          formatValue={(v) => v.toFixed(0)}
          size={28}
        />
        <Knob
          label="Det"
          value={data.unisonDetune}
          min={0}
          max={100}
          step={1}
          onChange={(v) => (state.unisonDetune = v)}
          color={color}
          modRoutes={modUnisonDetune}
          onModDrop={handleModDrop(targets.unisonDetune)}
          modTarget={targets.unisonDetune}
          formatValue={(v) => `${v.toFixed(0)}ct`}
          size={28}
        />
        <Knob
          label="Spr"
          value={data.unisonSpread}
          min={0}
          max={1}
          onChange={(v) => (state.unisonSpread = v)}
          color={color}
          modRoutes={modUnisonSpread}
          onModDrop={handleModDrop(targets.unisonSpread)}
          modTarget={targets.unisonSpread}
          size={28}
        />
      </div>

      {/* Phase + Level + Pan row */}
      <div className="grid grid-cols-4 gap-1">
        <Knob
          label="Phase"
          value={data.phaseOffset}
          min={0}
          max={1}
          onChange={(v) => (state.phaseOffset = v)}
          color={color}
          size={28}
        />
        <Knob
          label="Rand"
          value={data.randomPhase}
          min={0}
          max={1}
          onChange={(v) => (state.randomPhase = v)}
          color={color}
          size={28}
        />
        <Knob
          label="Level"
          value={data.level}
          min={0}
          max={1}
          onChange={(v) => (state.level = v)}
          color={color}
          modRoutes={modLevel}
          onModDrop={handleModDrop(targets.level)}
          modTarget={targets.level}
          size={28}
        />
        <Knob
          label="Pan"
          value={data.pan}
          min={-1}
          max={1}
          onChange={(v) => (state.pan = v)}
          color={color}
          modRoutes={modPan}
          onModDrop={handleModDrop(targets.pan)}
          modTarget={targets.pan}
          formatValue={(v) =>
            Math.abs(v) < 0.01
              ? "C"
              : v < 0
                ? `L${Math.abs(Math.round(v * 100))}`
                : `R${Math.round(v * 100)}`
          }
          size={28}
        />
      </div>
    </Panel>
  );
}
