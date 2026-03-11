"use client";
import { ModTarget } from "@/audio/dsp/modulation/modMatrix";
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
];

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
  { level: ModTarget; frame: ModTarget; warp: ModTarget; pitch: ModTarget }
> = {
  a: {
    level: ModTarget.OSC_A_LEVEL,
    frame: ModTarget.OSC_A_FRAME,
    warp: ModTarget.OSC_A_WARP_AMOUNT,
    pitch: ModTarget.OSC_A_PITCH,
  },
  b: {
    level: ModTarget.OSC_B_LEVEL,
    frame: ModTarget.OSC_B_FRAME,
    warp: ModTarget.OSC_B_WARP_AMOUNT,
    pitch: ModTarget.OSC_B_PITCH,
  },
  c: {
    level: ModTarget.OSC_C_LEVEL,
    frame: ModTarget.OSC_C_FRAME,
    warp: ModTarget.OSC_C_WARP_AMOUNT,
    pitch: ModTarget.OSC_C_PITCH,
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
  const numH = 32 + Math.round((frameIdx / 63) * 96); // 32–128

  for (let i = 0; i < N; i++) {
    const phase = (2 * Math.PI * i) / N;
    let s = 0;
    switch (waveformType) {
      case 0: // Sine → additive partials sweep
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
      default:
        s = Math.sin(phase);
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

  const W = 128;
  const H = 32;
  const pts: string[] = [];
  for (let i = 0; i < samples.length; i++) {
    pts.push(`${i},${((-samples[i] + 1) * H) / 2}`);
  }
  const points = pts.join(" ");

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full cursor-pointer rounded"
      style={{ height: 36, background: "color-mix(in srgb, var(--bg-darkest) 60%, transparent)" }}
      onClick={onClick}
    >
      <title>Click to edit waveform</title>
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
  const modFrame = useModRoutes(targets.frame);
  const modWarp = useModRoutes(targets.warp);
  const modPitch = useModRoutes(targets.pitch);

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
      {/* Waveform preview + warp selector */}
      <div className="mb-1.5">
        <WaveformPreview
          waveformType={data.waveformType}
          framePosition={data.framePosition}
          customWaveform={data.customWaveform}
          color={color}
          onClick={onOpenWaveEditor}
        />
      </div>
      <div className="flex gap-1 mb-1.5">
        <button
          type="button"
          onClick={onOpenWaveEditor}
          className="flex-1 px-2 py-0.5 text-[10px] text-text-secondary hover:text-text-primary bg-bg-surface border border-border-default rounded cursor-pointer transition-colors truncate"
          title="Edit waveform"
        >
          {data.waveformName}
        </button>
        <Select
          value={String(data.warpType)}
          options={WARP_OPTIONS}
          onChange={(v) => (state.warpType = Number(v))}
        />
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        <Knob
          label="Level"
          value={data.level}
          min={0}
          max={1}
          onChange={(v) => (state.level = v)}
          color={color}
          modRoutes={modLevel}
          onModDrop={handleModDrop(targets.level)}
          size={34}
        />
        <Knob
          label="Frame"
          value={data.framePosition}
          min={0}
          max={1}
          onChange={(v) => (state.framePosition = v)}
          color={color}
          modRoutes={modFrame}
          onModDrop={handleModDrop(targets.frame)}
          size={34}
        />
        <Knob
          label="Detune"
          value={data.detune}
          min={-100}
          max={100}
          step={1}
          onChange={(v) => (state.detune = v)}
          color={color}
          modRoutes={modPitch}
          onModDrop={handleModDrop(targets.pitch)}
          formatValue={(v) => `${v > 0 ? "+" : ""}${v.toFixed(0)}ct`}
          size={34}
        />
        <Knob
          label="Warp"
          value={data.warpAmount}
          min={0}
          max={1}
          onChange={(v) => (state.warpAmount = v)}
          color={color}
          modRoutes={modWarp}
          onModDrop={handleModDrop(targets.warp)}
          size={34}
        />
      </div>

      <div className="grid grid-cols-3 gap-1.5 mt-1.5">
        <Knob
          label="Unison"
          value={data.unisonVoices}
          min={1}
          max={16}
          step={1}
          onChange={(v) => (state.unisonVoices = v)}
          color={color}
          formatValue={(v) => v.toFixed(0)}
          size={34}
        />
        <Knob
          label="U.Det"
          value={data.unisonDetune}
          min={0}
          max={100}
          step={1}
          onChange={(v) => (state.unisonDetune = v)}
          color={color}
          formatValue={(v) => `${v.toFixed(0)}ct`}
          size={34}
        />
        <Knob
          label="Spread"
          value={data.unisonSpread}
          min={0}
          max={1}
          onChange={(v) => (state.unisonSpread = v)}
          color={color}
          size={34}
        />
      </div>
    </Panel>
  );
}
