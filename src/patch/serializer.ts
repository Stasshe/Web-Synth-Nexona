import { synthState } from "@/state/synthState";
import type { PatchData } from "./schema";

function serializeControlPoints(
  points: unknown[] | null,
): { id: string; x: number; y: number; curveType: number }[] | null {
  if (!points) return null;
  return points.map((p) => ({
    ...(p as { id: string; x: number; y: number; curveType: number }),
  }));
}

function serializeOsc(osc: typeof synthState.oscillators.a) {
  return {
    on: osc.on,
    waveformType: osc.waveformType,
    waveformName: osc.waveformName,
    customWaveform: osc.customWaveform ? [...osc.customWaveform] : null,
    controlPoints: serializeControlPoints(osc.controlPoints),
    level: osc.level,
    framePosition: osc.framePosition,
    detune: osc.detune,
    unisonVoices: osc.unisonVoices,
    unisonDetune: osc.unisonDetune,
    unisonSpread: osc.unisonSpread,
    pan: osc.pan,
    warpType: osc.warpType,
    warpAmount: osc.warpAmount,
    warp2Type: osc.warp2Type,
    warp2Amount: osc.warp2Amount,
    octave: osc.octave,
    semitone: osc.semitone,
    spectralMorphType: osc.spectralMorphType,
    spectralMorphAmount: osc.spectralMorphAmount,
    phaseOffset: osc.phaseOffset,
    randomPhase: osc.randomPhase,
  };
}

export function stateToPatch(name = "Init"): PatchData {
  const s = synthState;
  const sub = s.oscillators.sub;
  return {
    version: 2,
    name,
    oscillators: {
      a: serializeOsc(s.oscillators.a),
      b: serializeOsc(s.oscillators.b),
      c: serializeOsc(s.oscillators.c),
      sub: {
        on: sub.on,
        octave: sub.octave,
        level: sub.level,
        waveformName: sub.waveformName,
        customWaveform: sub.customWaveform ? [...sub.customWaveform] : null,
        controlPoints: serializeControlPoints(sub.controlPoints),
      },
    },
    noise: { ...s.noise },
    filter: { ...s.filter },
    filter2: { ...s.filter2 },
    envelopes: {
      amp: { ...s.envelopes.amp },
      filter: { ...s.envelopes.filter },
    },
    lfos: {
      lfo1: { ...s.lfos.lfo1 },
      lfo2: { ...s.lfos.lfo2 },
    },
    modulations: s.modulations.map((r) => ({ ...r })),
    effects: {
      distortion: { ...s.effects.distortion },
      compressor: { ...s.effects.compressor },
      chorus: { ...s.effects.chorus },
      flanger: { ...s.effects.flanger },
      phaser: { ...s.effects.phaser },
      delay: { ...s.effects.delay },
      reverb: { ...s.effects.reverb },
      eq: { ...s.effects.eq },
      effectsOrder: [...s.effectsOrder],
    },
    master: { ...s.master },
    drift: s.drift,
    macros: [...s.macros],
  };
}

export async function patchToUrl(patch: PatchData): Promise<string> {
  const json = JSON.stringify(patch);
  const blob = new Blob([json]);
  const cs = new CompressionStream("gzip");
  const stream = blob.stream().pipeThrough(cs);
  const compressed = await new Response(stream).arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(compressed)));
  return base64;
}
