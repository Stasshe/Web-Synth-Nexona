import type { ModRoute } from "@/audio/dsp/modulation/modMatrix";

export interface PatchData {
  version: 2;
  name: string;
  oscillators: {
    a: OscPatch;
    b: OscPatch;
    c: OscPatch;
    sub: {
      on: boolean;
      octave: number;
      level: number;
      waveformName: string;
      customWaveform: number[] | null;
      controlPoints: ControlPointPatch[] | null;
    };
  };
  noise: { type: number; level: number };
  filter: {
    on: boolean;
    cutoff: number;
    resonance: number;
    drive: number;
    type: number;
    envAmount: number;
    input?: number;
  };
  filter2: {
    on: boolean;
    cutoff: number;
    resonance: number;
    drive: number;
    type: number;
    envAmount: number;
    input?: number;
  };
  envelopes: {
    amp: EnvPatch;
    filter: EnvPatch;
  };
  lfos: {
    lfo1: { rate: number; shape: number };
    lfo2: { rate: number; shape: number };
  };
  modulations: ModRoute[];
  effects: {
    chorus: { rate: number; depth: number; mix: number };
    delay: { time: number; feedback: number; mix: number };
    reverb: { decay: number; mix: number };
  };
  master: { volume: number };
  drift: number;
  macros: number[];
}

interface OscPatch {
  on: boolean;
  waveformType: number;
  waveformName: string;
  customWaveform: number[] | null;
  controlPoints: ControlPointPatch[] | null;
  level: number;
  framePosition: number;
  detune: number;
  unisonVoices: number;
  unisonDetune: number;
  unisonSpread: number;
  pan: number;
  warpType: number;
  warpAmount: number;
  warp2Type: number;
  warp2Amount: number;
  octave: number;
  semitone: number;
  spectralMorphType: number;
  spectralMorphAmount: number;
  phaseOffset: number;
  randomPhase: number;
}

interface ControlPointPatch {
  id: string;
  x: number;
  y: number;
  curveType: number;
}

interface EnvPatch {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

export function validatePatch(data: unknown): data is PatchData {
  if (typeof data !== "object" || data === null) return false;
  const d = data as Record<string, unknown>;
  return d.version === 2 && typeof d.name === "string" && typeof d.oscillators === "object";
}
