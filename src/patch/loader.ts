import {
  type ControlPoint,
  type WaveformModel,
  sawModel,
  sineModel,
  squareModel,
  triangleModel,
} from "@/components/WaveformEditor/curveTypes";
import { generateWaveformFromPoints } from "@/components/WaveformEditor/generateFromPoints";
import { synthState } from "@/state/synthState";
import { type PatchData, validatePatch } from "./schema";

const TABLE_SIZE = 256;

const PRESET_MODELS: Record<string, () => WaveformModel> = {
  Sine: sineModel,
  Triangle: triangleModel,
  Saw: sawModel,
  Square: squareModel,
};

/** Regenerate customShape + controlPoints for an LFO state object. */
function buildLfoCustomShape(lfo: (typeof synthState.lfos)[keyof typeof synthState.lfos]): void {
  const pts = lfo.controlPoints as ControlPoint[] | null;
  let m: WaveformModel;
  if (pts && pts.length >= 2) {
    m = { points: pts.map((p) => ({ ...p })) };
  } else {
    const preset = lfo.presetName ?? "Sine";
    m = (PRESET_MODELS[preset] ?? sineModel)();
  }
  const table = generateWaveformFromPoints(m, TABLE_SIZE);
  lfo.customShape = Array.from(table);
  lfo.controlPoints = m.points as unknown[];
}

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
  Object.assign(s.oscillators.b, patch.oscillators.b);
  Object.assign(s.oscillators.c, patch.oscillators.c);
  Object.assign(s.oscillators.sub, patch.oscillators.sub);
  Object.assign(s.noise, patch.noise);
  Object.assign(s.filter, patch.filter);
  Object.assign(s.filter2, patch.filter2);
  Object.assign(s.envelopes.amp, patch.envelopes.amp);
  Object.assign(s.envelopes.filter, patch.envelopes.filter);
  Object.assign(s.lfos.lfo1, patch.lfos.lfo1);
  Object.assign(s.lfos.lfo2, patch.lfos.lfo2);
  // For non-Custom presets, clear stale controlPoints so the preset name drives shape generation.
  if (s.lfos.lfo1.presetName !== "Custom") s.lfos.lfo1.controlPoints = null;
  if (s.lfos.lfo2.presetName !== "Custom") s.lfos.lfo2.controlPoints = null;
  // Eagerly regenerate customShape so it's non-null for applyCustomWavetables and auto-save.
  buildLfoCustomShape(s.lfos.lfo1);
  buildLfoCustomShape(s.lfos.lfo2);
  s.modulations.splice(0, s.modulations.length, ...patch.modulations);
  // Restore all effects where present in the patch
  Object.assign(s.effects.distortion, patch.effects.distortion);
  Object.assign(s.effects.compressor, patch.effects.compressor);
  Object.assign(s.effects.chorus, patch.effects.chorus);
  Object.assign(s.effects.flanger, patch.effects.flanger);
  Object.assign(s.effects.phaser, patch.effects.phaser);
  Object.assign(s.effects.delay, patch.effects.delay);
  Object.assign(s.effects.reverb, patch.effects.reverb);
  Object.assign(s.effects.eq, patch.effects.eq);
  if (patch.effects.effectsOrder) s.effectsOrder = [...patch.effects.effectsOrder];
  Object.assign(s.master, patch.master);
  s.drift = patch.drift;
  s.macros.splice(0, s.macros.length, ...patch.macros);
}
