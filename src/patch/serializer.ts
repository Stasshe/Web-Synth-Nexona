import { synthState } from "@/state/synthState";
import type { PatchData } from "./schema";

export function stateToPatch(name = "Init"): PatchData {
  const s = synthState;
  const oscA = { ...s.oscillators.a };
  const oscB = { ...s.oscillators.b };
  // Ensure customWaveform is plain array (not Valtio proxy)
  oscA.customWaveform = oscA.customWaveform ? [...oscA.customWaveform] : null;
  oscB.customWaveform = oscB.customWaveform ? [...oscB.customWaveform] : null;
  const sub = s.oscillators.sub;
  return {
    version: 1,
    name,
    oscillators: {
      a: oscA,
      b: oscB,
      sub: {
        on: sub.on,
        octave: sub.octave,
        level: sub.level,
        waveformName: sub.waveformName,
        customWaveform: sub.customWaveform ? [...sub.customWaveform] : null,
        controlPoints: sub.controlPoints
          ? sub.controlPoints.map((p) => ({
              ...(p as { id: string; x: number; y: number; curveType: number }),
            }))
          : null,
      },
    },
    noise: { ...s.noise },
    filter: { ...s.filter },
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
