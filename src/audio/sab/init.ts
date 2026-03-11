import { SAB_BYTE_SIZE, SabParam, setParam } from "./layout";

export function createSAB(): SharedArrayBuffer {
  const sab = new SharedArrayBuffer(SAB_BYTE_SIZE);
  const view = new Int32Array(sab);

  // Master
  setParam(view, SabParam.MasterVolume, 0.8);

  // Osc A defaults
  setParam(view, SabParam.OscAOn, 1);
  setParam(view, SabParam.OscALevel, 0.8);
  setParam(view, SabParam.OscAFramePosition, 0);
  setParam(view, SabParam.OscADetune, 0);
  setParam(view, SabParam.OscAUnisonVoices, 1);
  setParam(view, SabParam.OscAUnisonDetune, 20);
  setParam(view, SabParam.OscAUnisonSpread, 0.5);
  setParam(view, SabParam.OscAPan, 0);
  setParam(view, SabParam.OscAWarpType, 0);
  setParam(view, SabParam.OscAWarpAmount, 0);
  setParam(view, SabParam.OscAWarp2Type, 0);
  setParam(view, SabParam.OscAWarp2Amount, 0);

  // Osc B defaults (off)
  setParam(view, SabParam.OscBOn, 0);
  setParam(view, SabParam.OscBLevel, 0.8);
  setParam(view, SabParam.OscBFramePosition, 0);
  setParam(view, SabParam.OscBDetune, 0);
  setParam(view, SabParam.OscBUnisonVoices, 1);
  setParam(view, SabParam.OscBUnisonDetune, 20);
  setParam(view, SabParam.OscBUnisonSpread, 0.5);
  setParam(view, SabParam.OscBPan, 0);
  setParam(view, SabParam.OscBWarpType, 0);
  setParam(view, SabParam.OscBWarpAmount, 0);
  setParam(view, SabParam.OscBWarp2Type, 0);
  setParam(view, SabParam.OscBWarp2Amount, 0);

  // Sub + Noise defaults (off)
  setParam(view, SabParam.SubOn, 0);
  setParam(view, SabParam.SubOctave, -1);
  setParam(view, SabParam.SubShape, 0);
  setParam(view, SabParam.SubLevel, 0.5);
  setParam(view, SabParam.NoiseType, 0);
  setParam(view, SabParam.NoiseLevel, 0);

  // Filter
  setParam(view, SabParam.FilterCutoff, 8000);
  setParam(view, SabParam.FilterResonance, 0);
  setParam(view, SabParam.FilterDrive, 1);
  setParam(view, SabParam.FilterType, 0);
  setParam(view, SabParam.FilterEnvAmount, 0);

  // Amp Envelope
  setParam(view, SabParam.AmpEnvAttack, 0.01);
  setParam(view, SabParam.AmpEnvDecay, 0.1);
  setParam(view, SabParam.AmpEnvSustain, 0.7);
  setParam(view, SabParam.AmpEnvRelease, 0.3);

  // Filter Envelope
  setParam(view, SabParam.FilterEnvAttack, 0.01);
  setParam(view, SabParam.FilterEnvDecay, 0.1);
  setParam(view, SabParam.FilterEnvSustain, 0);
  setParam(view, SabParam.FilterEnvRelease, 0.3);

  // LFOs
  setParam(view, SabParam.Lfo1Rate, 1);
  setParam(view, SabParam.Lfo1Shape, 0);
  setParam(view, SabParam.Lfo2Rate, 1);
  setParam(view, SabParam.Lfo2Shape, 0);

  // Effects (all dry by default)
  setParam(view, SabParam.ChorusRate, 0.5);
  setParam(view, SabParam.ChorusDepth, 0.3);
  setParam(view, SabParam.ChorusMix, 0);
  setParam(view, SabParam.DelayTime, 0.375);
  setParam(view, SabParam.DelayFeedback, 0.3);
  setParam(view, SabParam.DelayMix, 0);
  setParam(view, SabParam.ReverbDecay, 0.7);
  setParam(view, SabParam.ReverbMix, 0);

  // Misc
  setParam(view, SabParam.DriftAmount, 0);
  setParam(view, SabParam.Macro1, 0);
  setParam(view, SabParam.Macro2, 0);
  setParam(view, SabParam.Macro3, 0);
  setParam(view, SabParam.Macro4, 0);

  return sab;
}
