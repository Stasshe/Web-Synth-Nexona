import { synthState } from "@/state/synthState";
import { type PatchData, validatePatch } from "./schema";

export async function urlToPatch(base64: string): Promise<PatchData | null> {
  try {
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const ds = new DecompressionStream("gzip");
    const stream = new Blob([bytes]).stream().pipeThrough(ds);
    const text = await new Response(stream).text();
    const data = JSON.parse(text);
    if (validatePatch(data)) return data;
    return null;
  } catch {
    return null;
  }
}

export function loadPatchIntoState(patch: PatchData): void {
  const s = synthState;

  Object.assign(s.oscillators.a, patch.oscillators.a);
  // Fill defaults for older patches missing new fields
  if (!patch.oscillators.a.waveformName) s.oscillators.a.waveformName = "Sine";
  if (patch.oscillators.a.customWaveform === undefined) s.oscillators.a.customWaveform = null;
  if (patch.oscillators.a.controlPoints === undefined) s.oscillators.a.controlPoints = null;

  Object.assign(s.oscillators.b, patch.oscillators.b);
  if (!patch.oscillators.b.waveformName) s.oscillators.b.waveformName = "Sine";
  if (patch.oscillators.b.customWaveform === undefined) s.oscillators.b.customWaveform = null;
  if (patch.oscillators.b.controlPoints === undefined) s.oscillators.b.controlPoints = null;

  if (patch.oscillators.c) {
    Object.assign(s.oscillators.c, patch.oscillators.c);
    if (!patch.oscillators.c.waveformName) s.oscillators.c.waveformName = "Sine";
    if (patch.oscillators.c.customWaveform === undefined) s.oscillators.c.customWaveform = null;
    if (patch.oscillators.c.controlPoints === undefined) s.oscillators.c.controlPoints = null;
  }

  Object.assign(s.oscillators.sub, patch.oscillators.sub);
  // Fill defaults for older patches missing sub waveform fields
  if (!s.oscillators.sub.waveformName) s.oscillators.sub.waveformName = "Sine";
  if (s.oscillators.sub.customWaveform === undefined) s.oscillators.sub.customWaveform = null;
  if (s.oscillators.sub.controlPoints === undefined) s.oscillators.sub.controlPoints = null;
  Object.assign(s.noise, patch.noise);
  Object.assign(s.filter, patch.filter);
  if (patch.filter2) {
    Object.assign(s.filter2, patch.filter2);
  }
  Object.assign(s.envelopes.amp, patch.envelopes.amp);
  Object.assign(s.envelopes.filter, patch.envelopes.filter);
  Object.assign(s.lfos.lfo1, patch.lfos.lfo1);
  Object.assign(s.lfos.lfo2, patch.lfos.lfo2);
  s.modulations.splice(0, s.modulations.length, ...patch.modulations);
  Object.assign(s.effects.chorus, patch.effects.chorus);
  Object.assign(s.effects.delay, patch.effects.delay);
  Object.assign(s.effects.reverb, patch.effects.reverb);
  Object.assign(s.master, patch.master);
  s.drift = patch.drift;
  s.macros.splice(0, s.macros.length, ...patch.macros);
}
