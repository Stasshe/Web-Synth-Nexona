"use client";
import { ModTarget } from "@/audio/dsp/modulation/modMatrix";
import { SPECTRAL_MORPH_NAMES } from "@/audio/dsp/spectralMorph/spectralMorphTypes";
import { UNISON_STACK_NAMES } from "@/audio/dsp/oscillator/unisonEngine";
import { DISTORTION_NAMES, usesDistortionPhase } from "@/audio/dsp/warp/warpTypes";
import { PRESET_COUNT, PRESET_NAMES } from "@/audio/dsp/wavetable/wavetablePresets";
import { Knob } from "@/components/ui/Knob";
import { Panel } from "@/components/ui/Panel";
import { SelectPopup } from "@/components/ui/SelectPopup";
import { SelectWithArrows } from "@/components/ui/SelectWithArrows";
import { UnisonViewer } from "@/components/OscillatorPanel/UnisonViewer";
import { Wavetable3dViewer } from "@/components/OscillatorPanel/WavetablePreview";
import type { ModSourceDragItem } from "@/dnd/types";
import { useModRoutes } from "@/hooks/useModAmount";
import { synthState } from "@/state/synthState";
import { Pencil } from "lucide-react";
import { useCallback } from "react";
import { useSnapshot } from "valtio";

const DISTORTION_OPTIONS = Object.entries(DISTORTION_NAMES).map(([value, label]) => ({
  value,
  label,
}));

const SPECTRAL_MORPH_OPTIONS = Object.entries(SPECTRAL_MORPH_NAMES).map(([value, label]) => ({
  value,
  label,
}));

const UNISON_STACK_OPTIONS = Object.entries(UNISON_STACK_NAMES).map(([value, label]) => ({
  value,
  label,
}));

const DESTINATION_OPTIONS = [
  { value: "0", label: "Filt 1" },
  { value: "1", label: "Filt 2" },
  { value: "2", label: "Dual" },
  { value: "3", label: "Effects" },
];

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
    distortionPhase: ModTarget;
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
    distortionPhase: ModTarget.OSC_A_DISTORTION_PHASE,
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
    distortionPhase: ModTarget.OSC_B_DISTORTION_PHASE,
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
    distortionPhase: ModTarget.OSC_C_DISTORTION_PHASE,
    pitch: ModTarget.OSC_C_PITCH,
    spectralMorph: ModTarget.OSC_C_SPECTRAL_MORPH,
    pan: ModTarget.OSC_C_PAN,
    unisonDetune: ModTarget.OSC_C_UNISON_DETUNE,
    unisonSpread: ModTarget.OSC_C_UNISON_SPREAD,
  },
};

export function OscillatorPanel({ osc, onOpenWaveEditor }: OscillatorPanelProps) {
  const snap = useSnapshot(synthState);
  const data = snap.oscillators[osc];
  const state = synthState.oscillators[osc];
  const color = OSC_COLORS[osc];
  const targets = OSC_MOD_TARGETS[osc];
  const modLevel = useModRoutes(targets.level);
  const modWarp = useModRoutes(targets.warp);
  const modDistPhase = useModRoutes(targets.distortionPhase);
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

  const showDistPhase = usesDistortionPhase(data.distortionType as number);

  return (
    <Panel
      title={`OSC ${osc.toUpperCase()}`}
      color={color}
      onToggle={() => (state.on = !state.on)}
      enabled={data.on}
    >
      {/* ── Row 1: waveform preview + Level/Pan/Trans/Tune ── */}
      <div className="flex gap-1.5 mb-1 items-stretch">
        {/* Waveform preview */}
        <div className="flex-1 min-w-0">
          <Wavetable3dViewer
            waveformType={data.waveformType}
            framePosition={data.framePosition}
            customWaveform={data.customWaveform}
            color={color}
            spectralMorphType={data.spectralMorphType}
            spectralMorphAmount={data.spectralMorphAmount}
            onClick={onOpenWaveEditor}
          />
        </div>
        {/* 2×2 knob block: Level Pan / Trans Tune */}
        <div className="grid grid-cols-2 gap-x-0.5 gap-y-0 content-between">
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
            size={26}
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
              Math.abs(v) < 0.01 ? "C" : v < 0 ? `L${Math.abs(Math.round(v * 100))}` : `R${Math.round(v * 100)}`
            }
            size={26}
          />
          <Knob
            label="Trans"
            value={data.transpose}
            min={-48}
            max={48}
            step={1}
            onChange={(v) => (state.transpose = Math.round(v))}
            color={color}
            modRoutes={modPitch}
            onModDrop={handleModDrop(targets.pitch)}
            modTarget={targets.pitch}
            formatValue={(v) => `${v > 0 ? "+" : ""}${v.toFixed(0)}`}
            size={26}
          />
          <Knob
            label="Tune"
            value={data.tune}
            min={-100}
            max={100}
            step={1}
            onChange={(v) => (state.tune = v)}
            color={color}
            formatValue={(v) => `${v > 0 ? "+" : ""}${v.toFixed(0)}ct`}
            size={26}
          />
        </div>
      </div>

      {/* ── Row 2: preset name + edit + dest ── */}
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
          className="flex-1 min-w-0"
        />
        <button
          type="button"
          onClick={onOpenWaveEditor}
          className="shrink-0 px-1 py-0.5 text-text-secondary hover:text-text-primary bg-bg-surface border border-border-default rounded cursor-pointer transition-colors"
          title="Edit waveform"
        >
          <Pencil size={10} />
        </button>
        <SelectPopup
          value={String(data.destination)}
          options={DESTINATION_OPTIONS}
          onChange={(v) => (state.destination = Number(v))}
        />
      </div>

      {/* ── Row 3: frame position slider ── */}
      <div className="flex items-center gap-1.5 mb-1.5">
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
          size={20}
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
        />
      </div>

      {/* ── Row 4: Spectral morph ── */}
      <div className="flex items-center gap-1 mb-0.5">
        <span className="text-[8px] text-text-secondary shrink-0 w-10">Spectral</span>
        <SelectPopup
          value={String(data.spectralMorphType)}
          options={SPECTRAL_MORPH_OPTIONS}
          onChange={(v) => (state.spectralMorphType = Number(v))}
        />
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
          size={22}
        />
      </div>

      {/* ── Row 5: Distortion ── */}
      <div className="flex items-center gap-1 mb-1.5">
        <span className="text-[8px] text-text-secondary shrink-0 w-10">Dist</span>
        <SelectPopup
          value={String(data.distortionType)}
          options={DISTORTION_OPTIONS}
          onChange={(v) => (state.distortionType = Number(v))}
        />
        <Knob
          label="Amt"
          value={data.distortionAmount}
          min={0}
          max={1}
          onChange={(v) => (state.distortionAmount = v)}
          color={color}
          modRoutes={modWarp}
          onModDrop={handleModDrop(targets.warp)}
          modTarget={targets.warp}
          size={22}
        />
        {showDistPhase && (
          <Knob
            label="Phase"
            value={data.distortionPhase}
            min={0}
            max={1}
            onChange={(v) => (state.distortionPhase = v)}
            color={color}
            modRoutes={modDistPhase}
            onModDrop={handleModDrop(targets.distortionPhase)}
            modTarget={targets.distortionPhase}
            size={22}
          />
        )}
      </div>

      {/* ── Row 6: Phase + Rand ── */}
      <div className="flex items-center gap-1 mb-1.5">
        <span className="text-[8px] text-text-secondary shrink-0 w-10">Phase</span>
        <Knob
          label="Offset"
          value={data.phaseOffset}
          min={0}
          max={1}
          onChange={(v) => (state.phaseOffset = v)}
          color={color}
          size={22}
        />
        <Knob
          label="Rand"
          value={data.randomPhase}
          min={0}
          max={1}
          onChange={(v) => (state.randomPhase = v)}
          color={color}
          size={22}
        />
      </div>

      {/* ── Row 7: Unison ── */}
      <div>
        <div className="flex items-center gap-0.5 flex-wrap mb-0.5">
          <span className="text-[8px] text-text-secondary mr-0.5 w-10 shrink-0">Unison</span>
          <Knob
            label="Vx"
            value={data.unisonVoices}
            min={1}
            max={16}
            step={1}
            onChange={(v) => (state.unisonVoices = v)}
            color={color}
            formatValue={(v) => v.toFixed(0)}
            size={22}
          />
          <Knob
            label="Det"
            value={data.unisonDetune}
            min={0}
            max={1}
            onChange={(v) => (state.unisonDetune = v)}
            color={color}
            modRoutes={modUnisonDetune}
            onModDrop={handleModDrop(targets.unisonDetune)}
            modTarget={targets.unisonDetune}
            formatValue={(v) => `${Math.round(v * 100)}%`}
            size={22}
          />
          <Knob
            label="Pwr"
            value={data.unisonDetunePower}
            min={-5}
            max={5}
            onChange={(v) => (state.unisonDetunePower = v)}
            color={color}
            formatValue={(v) => v.toFixed(1)}
            size={22}
          />
          <Knob
            label="Blend"
            value={data.unisonBlend}
            min={0}
            max={1}
            onChange={(v) => (state.unisonBlend = v)}
            color={color}
            size={22}
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
            size={22}
          />
          <SelectPopup
            value={String(data.unisonStackType)}
            options={UNISON_STACK_OPTIONS}
            onChange={(v) => (state.unisonStackType = Number(v))}
          />
        </div>
        {data.unisonVoices > 1 && (
          <UnisonViewer
            count={data.unisonVoices}
            detune={data.unisonDetune}
            blend={data.unisonBlend}
            detunePower={data.unisonDetunePower}
            detuneRange={data.unisonDetuneRange}
            stereoSpread={data.unisonSpread}
            color={color}
          />
        )}
      </div>
    </Panel>
  );
}
