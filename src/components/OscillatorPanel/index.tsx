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
import { Pencil } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  const numH = 64;

  for (let i = 0; i < N; i++) {
    const phase = (2 * Math.PI * i) / N;
    let s = 0;
    switch (waveformType) {
      case 0: {
        // Init (saw with bandwidth)
        const frameH = 32 + Math.round(f * 96);
        for (let h = 1; h <= frameH; h++) s += Math.sin(h * phase) / h;
        break;
      }
      case 1: {
        // Basic Shapes
        for (let h = 1; h <= numH; h++) {
          const sine = h === 1 ? 1 : 0;
          const tri = h % 2 === 1 ? (((h - 1) / 2) % 2 === 0 ? 1 : -1) / (h * h) : 0;
          const sq = h % 2 === 1 ? 1 / h : 0;
          const saw = 1 / h;
          let amp: number;
          if (f < 1 / 3) amp = sine * (1 - f * 3) + tri * f * 3;
          else if (f < 2 / 3) amp = tri * (1 - (f - 1 / 3) * 3) + sq * ((f - 1 / 3) * 3);
          else amp = sq * (1 - (f - 2 / 3) * 3) + saw * ((f - 2 / 3) * 3);
          if (Math.abs(amp) > 1e-8) s += Math.sin(h * phase) * amp;
        }
        break;
      }
      case 2: {
        // PWM
        const width = 0.05 + f * 0.9;
        for (let h = 1; h <= numH; h++) {
          const amp = (2 / (h * Math.PI)) * Math.sin(h * Math.PI * width);
          if (Math.abs(amp) > 1e-8) s += Math.sin(h * phase) * amp;
        }
        break;
      }
      case 3: {
        // Formant
        const vowels = [
          [730, 1090, 2440],
          [270, 2290, 3010],
          [300, 870, 2240],
          [660, 1720, 2410],
        ];
        const bw = [130, 180, 250];
        const baseFreq = 130.81;
        const vowelPos = f * (vowels.length - 1);
        const vIdx = Math.min(Math.floor(vowelPos), vowels.length - 2);
        const vFrac = vowelPos - vIdx;
        const formants = [
          vowels[vIdx][0] * (1 - vFrac) + vowels[vIdx + 1][0] * vFrac,
          vowels[vIdx][1] * (1 - vFrac) + vowels[vIdx + 1][1] * vFrac,
          vowels[vIdx][2] * (1 - vFrac) + vowels[vIdx + 1][2] * vFrac,
        ];
        for (let h = 1; h <= numH; h++) {
          const hFreq = h * baseFreq;
          let amp = 0;
          for (let fi = 0; fi < 3; fi++) {
            const diff = hFreq - formants[fi];
            amp += Math.exp(-(diff * diff) / (2 * bw[fi] * bw[fi]));
          }
          amp /= Math.sqrt(h);
          if (amp > 1e-8) s += Math.sin(h * phase) * amp;
        }
        break;
      }
      case 4: {
        // Additive
        for (let h = 1; h <= numH; h++) {
          let amp: number;
          if (f < 0.2) {
            const blend = f * 5;
            amp = h === 1 ? 1 : h % 2 === 1 ? blend / h : 0;
          } else if (f < 0.4) {
            const blend = (f - 0.2) * 5;
            amp = h % 2 === 1 ? 1 / h : (blend * 0.8) / h;
          } else if (f < 0.6) {
            const blend = (f - 0.4) * 5;
            const isSaw = 1 / h;
            const isThird = h % 3 === 1 ? 1 / h : 0;
            amp = isSaw * (1 - blend) + isThird * blend;
          } else if (f < 0.8) {
            const blend = (f - 0.6) * 5;
            const isThird = h % 3 === 1 ? 1 / h : 0;
            const revSaw = 1 / (numH - h + 1);
            amp = isThird * (1 - blend) + revSaw * blend * 0.5;
          } else {
            const blend = (f - 0.8) * 5;
            const revSaw = 1 / (numH - h + 1);
            const buzz = 1 / Math.sqrt(h);
            amp = revSaw * 0.5 * (1 - blend) + buzz * blend;
          }
          if (Math.abs(amp) > 1e-8) s += Math.sin(h * phase) * amp;
        }
        break;
      }
      case 5: {
        // Digital (FM)
        const ratios = [1, 2, 3, 1.5, 2.5, 3.5, 4, 5];
        const ratioIdx = f * (ratios.length - 1);
        const rIdx = Math.min(Math.floor(ratioIdx), ratios.length - 2);
        const rFrac = ratioIdx - rIdx;
        const ratio = ratios[rIdx] * (1 - rFrac) + ratios[rIdx + 1] * rFrac;
        const modIndex = 0.5 + f * 4;
        s = Math.sin(phase + modIndex * Math.sin(ratio * phase));
        break;
      }
      case 6: {
        // Pluck
        for (let h = 1; h <= numH; h++) {
          const decay = Math.exp(-h * f * 4);
          const amp = decay / h;
          if (amp > 1e-8) s += Math.sin(h * phase) * amp;
        }
        break;
      }
      case 12: {
        // Sync Sweep
        const ratio = 1 + f * 7;
        const slavePhase = ((i / N) * ratio) % 1;
        s = Math.sin(2 * Math.PI * slavePhase);
        break;
      }
      default:
        // Generic: saw-like shape for remaining presets
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

function PresetListPopup({
  currentType,
  onSelect,
  onClose,
}: {
  currentType: number;
  onSelect: (index: number) => void;
  onClose: () => void;
}) {
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={popupRef}
      className="absolute z-50 mt-1 left-0 right-0 bg-bg-panel border border-border-default rounded shadow-lg max-h-48 overflow-y-auto"
    >
      {Array.from({ length: PRESET_COUNT }, (_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => {
            onSelect(i);
            onClose();
          }}
          className={`w-full text-left px-2 py-1 text-[10px] cursor-pointer transition-colors ${
            i === currentType
              ? "text-text-primary bg-bg-darkest"
              : "text-text-secondary hover:text-text-primary hover:bg-bg-surface"
          }`}
        >
          {PRESET_NAMES[i]}
        </button>
      ))}
    </div>
  );
}

export function OscillatorPanel({ osc, onOpenWaveEditor }: OscillatorPanelProps) {
  const snap = useSnapshot(synthState);
  const data = snap.oscillators[osc];
  const state = synthState.oscillators[osc];
  const color = OSC_COLORS[osc];
  const targets = OSC_MOD_TARGETS[osc];
  const [showPresetList, setShowPresetList] = useState(false);

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

  const selectPreset = useCallback(
    (index: number) => {
      state.waveformType = index;
      state.waveformName = PRESET_NAMES[index] ?? "Custom";
      state.customWaveform = null;
      state.controlPoints = null;
    },
    [state],
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
        />
      </div>

      {/* Preset selector */}
      <div className="relative flex items-center gap-1 mb-1">
        <button
          type="button"
          onClick={() => cyclePreset(-1)}
          className="px-1.5 py-0.5 text-[10px] text-text-secondary hover:text-text-primary bg-bg-surface border border-border-default rounded cursor-pointer transition-colors"
        >
          &lt;
        </button>
        <button
          type="button"
          onClick={() => setShowPresetList(!showPresetList)}
          className="flex-1 px-2 py-0.5 text-[10px] text-text-secondary hover:text-text-primary bg-bg-surface border border-border-default rounded cursor-pointer transition-colors truncate text-center"
          title="Select preset"
        >
          {presetName}
        </button>
        <button
          type="button"
          onClick={onOpenWaveEditor}
          className="px-1 py-0.5 text-text-secondary hover:text-text-primary bg-bg-surface border border-border-default rounded cursor-pointer transition-colors"
          title="Edit waveform"
        >
          <Pencil size={10} />
        </button>
        <button
          type="button"
          onClick={() => cyclePreset(1)}
          className="px-1.5 py-0.5 text-[10px] text-text-secondary hover:text-text-primary bg-bg-surface border border-border-default rounded cursor-pointer transition-colors"
        >
          &gt;
        </button>
        {showPresetList && (
          <PresetListPopup
            currentType={data.waveformType}
            onSelect={selectPreset}
            onClose={() => setShowPresetList(false)}
          />
        )}
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
