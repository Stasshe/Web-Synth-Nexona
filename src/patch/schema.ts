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
    blend?: number;
    style?: number;
  };
  filter2: {
    on: boolean;
    cutoff: number;
    resonance: number;
    drive: number;
    type: number;
    envAmount: number;
    input?: number;
    blend?: number;
    style?: number;
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
    distortion?: { drive: number; tone: number; mix: number; mode: number };
    compressor?: {
      threshold: number;
      ratio: number;
      attack: number;
      release: number;
      makeup: number;
      mix: number;
      knee: number;
    };
    chorus: { rate: number; depth: number; mix: number };
    flanger?: { rate: number; depth: number; feedback: number; mix: number };
    phaser?: { rate: number; depth: number; feedback: number; mix: number };
    delay: { time: number; feedback: number; mix: number };
    reverb: { decay: number; mix: number };
    eq?: { lowGain: number; midGain: number; highGain: number; mix: number };
    effectsOrder?: string[];
  };
  master: { volume: number };
  drift: number;
  macros: number[];
}

export interface OscPatch {
  on: boolean;
  waveformType: number;
  waveformName: string;
  customWaveform: number[] | null;
  controlPoints: ControlPointPatch[] | null;
  level: number;
  framePosition: number;
  // Vital-compatible fields
  tune: number;
  transpose: number;
  unisonVoices: number;
  unisonDetune: number;
  unisonSpread: number;
  unisonBlend: number;
  unisonStackType: number;
  unisonDetunePower: number;
  unisonDetuneRange: number;
  unisonFrameSpread: number;
  unisonSpectralMorphSpread: number;
  unisonDistortionSpread: number;
  pan: number;
  distortionType: number;
  distortionAmount: number;
  distortionPhase: number;
  spectralMorphType: number;
  spectralMorphAmount: number;
  phaseOffset: number;
  randomPhase: number;
  destination: number;
  // Legacy optional fields
  detune?: number;
  octave?: number;
  semitone?: number;
  warpType?: number;
  warpAmount?: number;
  warp2Type?: number;
  warp2Amount?: number;
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
