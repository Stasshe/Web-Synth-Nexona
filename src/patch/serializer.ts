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

export function stateToPatch(name = "Init"): PatchData {
  const s = synthState;
  const a = s.oscillators.a;
  const b = s.oscillators.b;
  const c = s.oscillators.c;
  const sub = s.oscillators.sub;
  return {
    version: 1,
    name,
    oscillators: {
      a: {
        on: a.on,
        waveformType: a.waveformType,
        waveformName: a.waveformName,
        customWaveform: a.customWaveform ? [...a.customWaveform] : null,
        controlPoints: serializeControlPoints(a.controlPoints),
        level: a.level,
        framePosition: a.framePosition,
        detune: a.detune,
        unisonVoices: a.unisonVoices,
        unisonDetune: a.unisonDetune,
        unisonSpread: a.unisonSpread,
        pan: a.pan,
        warpType: a.warpType,
        warpAmount: a.warpAmount,
        warp2Type: a.warp2Type,
        warp2Amount: a.warp2Amount,
      },
      b: {
        on: b.on,
        waveformType: b.waveformType,
        waveformName: b.waveformName,
        customWaveform: b.customWaveform ? [...b.customWaveform] : null,
        controlPoints: serializeControlPoints(b.controlPoints),
        level: b.level,
        framePosition: b.framePosition,
        detune: b.detune,
        unisonVoices: b.unisonVoices,
        unisonDetune: b.unisonDetune,
        unisonSpread: b.unisonSpread,
        pan: b.pan,
        warpType: b.warpType,
        warpAmount: b.warpAmount,
        warp2Type: b.warp2Type,
        warp2Amount: b.warp2Amount,
      },
      c: {
        on: c.on,
        waveformType: c.waveformType,
        waveformName: c.waveformName,
        customWaveform: c.customWaveform ? [...c.customWaveform] : null,
        controlPoints: serializeControlPoints(c.controlPoints),
        level: c.level,
        framePosition: c.framePosition,
        detune: c.detune,
        unisonVoices: c.unisonVoices,
        unisonDetune: c.unisonDetune,
        unisonSpread: c.unisonSpread,
        pan: c.pan,
        warpType: c.warpType,
        warpAmount: c.warpAmount,
        warp2Type: c.warp2Type,
        warp2Amount: c.warp2Amount,
      },
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
      chorus: { ...s.effects.chorus },
      delay: { ...s.effects.delay },
      reverb: { ...s.effects.reverb },
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
