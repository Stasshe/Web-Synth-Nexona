"use client";
import { ModTarget } from "@/audio/dsp/modulation/modMatrix";
import { SPECTRAL_MORPH_NAMES } from "@/audio/dsp/spectralMorph/spectralMorphTypes";
import { PRESET_COUNT, PRESET_NAMES } from "@/audio/dsp/wavetable/wavetablePresets";
import { Knob } from "@/components/ui/Knob";
import { Panel } from "@/components/ui/Panel";
import { Select } from "@/components/ui/Select";
import type { ModSourceDragItem } from "@/dnd/types";
import { useModRoutes } from "@/hooks/useModAmount";
import { synthState } from "@/state/synthState";
import { useCallback, useMemo } from "react";
import { useSnapshot } from "valtio";

const WARP_OPTIONS = [
  { value: "0", label: "None" },
  { value: "1", label: "Bend" },
  { value: "2", label: "Sync" },
  { value: "3", label: "PD" },
  { value: "4", label: "Mirror" },
  { value: "5", label: "Quantize" },
  { value: "6", label: "FM" },
  { value: "7", label: "Formant" },
  { value: "8", label: "Squeeze" },
  { value: "9", label: "PW" },
];

const SPECTRAL_MORPH_OPTIONS = Object.entries(SPECTRAL_MORPH_NAMES).map(([value, label]) => ({
  value,
  label,
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
    pitch: ModTarget;
    spectralMorph: ModTarget;
  }
> = {
  a: {
    level: ModTarget.OSC_A_LEVEL,
    frame: ModTarget.OSC_A_FRAME,
    warp: ModTarget.OSC_A_WARP_AMOUNT,
    pitch: ModTarget.OSC_A_PITCH,
    spectralMorph: ModTarget.OSC_A_SPECTRAL_MORPH,
  },
  b: {
    level: ModTarget.OSC_B_LEVEL,
    frame: ModTarget.OSC_B_FRAME,
    warp: ModTarget.OSC_B_WARP_AMOUNT,
    pitch: ModTarget.OSC_B_PITCH,
    spectralMorph: ModTarget.OSC_B_SPECTRAL_MORPH,
  },
  c: {
    level: ModTarget.OSC_C_LEVEL,
    frame: ModTarget.OSC_C_FRAME,
    warp: ModTarget.OSC_C_WARP_AMOUNT,
    pitch: ModTarget.OSC_C_PITCH,
    spectralMorph: ModTarget.OSC_C_SPECTRAL_MORPH,
  },
};

function computePreviewSamples(
  waveformType: number,
  framePosition: number,
  customWaveform: readonly number[] | null,
): Float32Array {
  const N = 128;
  if (customWaveform && customWaveform.length > 1) {
    const out = new Float32Array(N);
    const srcLen = customWaveform.length;
    for (let i = 0; i < N; i++) {
      const t = (i / N) * (srcLen - 1);
      const lo = Math.floor(t);
      const hi = Math.min(lo + 1, srcLen - 1);
      const frac = t - lo;
      out[i] = customWaveform[lo] * (1 - frac) + customWaveform[hi] * frac;
    }
    return out;
  }

  const result = new Float32Array(N);
  const f = framePosition;
  const frameIdx = Math.round(f * 63);
  const numH = 32 + Math.round((frameIdx / 63) * 96);

  for (let i = 0; i < N; i++) {
    const phase = (2 * Math.PI * i) / N;
    let s = 0;
    switch (waveformType) {
      case 0: // Sine
        s = Math.sin(phase);
        for (let h = 2; h <= numH; h++) {
          s += Math.sin(h * phase) * (1 / (h * h)) * f;
        }
        break;
      case 1: // Saw
        for (let h = 1; h <= numH; h++) s += Math.sin(h * phase) / h;
        break;
      case 2: // Square
        for (let h = 1; h <= numH; h += 2) s += Math.sin(h * phase) / h;
        break;
      case 3: // Triangle
        for (let h = 1; h <= numH; h += 2) {
          const sign = ((h - 1) / 2) % 2 === 0 ? 1 : -1;
          s += (sign * Math.sin(h * phase)) / (h * h);
        }
        break;
      case 5: {
        // Basic Shapes
        const t4 = f;
        for (let h = 1; h <= 64; h++) {
          const sine = h === 1 ? 1 : 0;
          const tri = h % 2 === 1 ? (((h - 1) / 2) % 2 === 0 ? 1 : -1) / (h * h) : 0;
          const sq = h % 2 === 1 ? 1 / h : 0;
          const saw = 1 / h;
          let amp: number;
          if (t4 < 1 / 3) amp = sine * (1 - t4 * 3) + tri * t4 * 3;
          else if (t4 < 2 / 3) amp = tri * (1 - (t4 - 1 / 3) * 3) + sq * ((t4 - 1 / 3) * 3);
          else amp = sq * (1 - (t4 - 2 / 3) * 3) + saw * ((t4 - 2 / 3) * 3);
          if (Math.abs(amp) > 1e-8) s += Math.sin(h * phase) * amp;
        }
        break;
      }
      case 6: {
        // PWM
        const width = 0.05 + f * 0.9;
        for (let h = 1; h <= 64; h++) {
          const amp = (2 / (h * Math.PI)) * Math.sin(h * Math.PI * width);
          if (Math.abs(amp) > 1e-8) s += Math.sin(h * phase) * amp;
        }
        break;
      }
      default: // For presets 4,7-11, show a basic saw-like shape
        for (let h = 1; h <= numH; h++) s += Math.sin(h * phase) / h;
        break;
    }
    result[i] = s;
  }
  let max = 0;
  for (let i = 0; i < N; i++) max = Math.max(max, Math.abs(result[i]));
  if (max > 0) for (let i = 0; i < N; i++) result[i] /= max;
  return result;
}

function WaveformPreview({
  waveformType,
  framePosition,
  customWaveform,
  color,
  onClick,
}: {
  waveformType: number;
  framePosition: number;
  customWaveform: readonly number[] | null;
  color: string;
  onClick?: () => void;
}) {
  const samples = useMemo(
    () => computePreviewSamples(waveformType, framePosition, customWaveform),
    [waveformType, framePosition, customWaveform],
  );

  // Render multiple ghost frames for 3D wavetable effect
  const ghostFrames = useMemo(() => {
    if (waveformType < 0 || (customWaveform && customWaveform.length > 1)) return [];
    const ghosts: { points: string; opacity: number; offsetY: number }[] = [];
    const offsets = [-0.15, -0.08, 0.08, 0.15];
    for (const off of offsets) {
      const fp = Math.max(0, Math.min(1, framePosition + off));
      const s = computePreviewSamples(waveformType, fp, null);
      const ghostH = 64;
      const pts: string[] = [];
      for (let i = 0; i < s.length; i++) {
        pts.push(`${i},${((-s[i] + 1) * ghostH) / 2 + Math.abs(off) * 40}`);
      }
      ghosts.push({ points: pts.join(" "), opacity: 0.15, offsetY: off * 20 });
    }
    return ghosts;
  }, [waveformType, framePosition, customWaveform]);

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
  const modPitch = useModRoutes(targets.pitch);
  const modSpectralMorph = useModRoutes(targets.spectralMorph);

  const handleModDrop = useCallback(
    (target: ModTarget) => (item: ModSourceDragItem) => {
      synthState.modulations.push({ source: item.source, target, amount: 0.5 });
    },
    [],
  );

  const presetName =
    data.waveformType === -1 ? "Custom" : (PRESET_NAMES[data.waveformType] ?? "Unknown");

  const cyclePreset = useCallback(
    (dir: 1 | -1) => {
      const current = data.waveformType;
      if (current === -1) {
        // From custom, go to first/last preset
        state.waveformType = dir === 1 ? 0 : PRESET_COUNT - 1;
      } else {
        const next = current + dir;
        if (next < 0) state.waveformType = PRESET_COUNT - 1;
        else if (next >= PRESET_COUNT) state.waveformType = 0;
        else state.waveformType = next;
      }
      state.waveformName = PRESET_NAMES[state.waveformType] ?? "Custom";
      state.customWaveform = null;
      state.controlPoints = null;
    },
    [data.waveformType, state],
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
          onClick={onOpenWaveEditor}
        />
      </div>

      {/* Preset selector */}
      <div className="flex items-center gap-1 mb-1">
        <button
          type="button"
          onClick={() => cyclePreset(-1)}
          className="px-1.5 py-0.5 text-[10px] text-text-secondary hover:text-text-primary bg-bg-surface border border-border-default rounded cursor-pointer transition-colors"
        >
          &lt;
        </button>
        <button
          type="button"
          onClick={onOpenWaveEditor}
          className="flex-1 px-2 py-0.5 text-[10px] text-text-secondary hover:text-text-primary bg-bg-surface border border-border-default rounded cursor-pointer transition-colors truncate text-center"
          title="Edit waveform"
        >
          {presetName}
        </button>
        <button
          type="button"
          onClick={() => cyclePreset(1)}
          className="px-1.5 py-0.5 text-[10px] text-text-secondary hover:text-text-primary bg-bg-surface border border-border-default rounded cursor-pointer transition-colors"
        >
          &gt;
        </button>
      </div>

      {/* Frame position slider */}
      <div className="mb-1.5 px-0.5">
        <input
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={data.framePosition}
          onChange={(e) => (state.framePosition = Number(e.target.value))}
          className="w-full h-1.5 rounded appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, ${color} ${data.framePosition * 100}%, var(--bg-darkest) ${data.framePosition * 100}%)`,
            accentColor: color,
          }}
          title={`Frame: ${Math.round(data.framePosition * 63)}`}
        />
      </div>

      {/* Spectral Morph + Distortion row */}
      <div className="grid grid-cols-2 gap-1 mb-1.5">
        <div>
          <div className="text-[8px] text-text-secondary mb-0.5 uppercase tracking-wider">
            Spectral
          </div>
          <Select
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
              size={28}
            />
          </div>
        </div>
        <div>
          <div className="text-[8px] text-text-secondary mb-0.5 uppercase tracking-wider">
            Distortion
          </div>
          <Select
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
          size={28}
        />
        <Knob
          label="Pan"
          value={data.pan}
          min={-1}
          max={1}
          onChange={(v) => (state.pan = v)}
          color={color}
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
