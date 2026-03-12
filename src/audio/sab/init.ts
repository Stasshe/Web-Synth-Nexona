import { SAB_BYTE_SIZE, SabParam, setParam } from "./layout";

export function createSAB(): SharedArrayBuffer {
  const sab = new SharedArrayBuffer(SAB_BYTE_SIZE);
  const view = new Int32Array(sab);

  // Master
  setParam(view, SabParam.MasterVolume, 0.8);

  // Osc A defaults
  setParam(view, SabParam.OscAOn, 1);
  setParam(view, SabParam.OscAWavetableIndex, 0);
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
  setParam(view, SabParam.OscAOctave, 0);
  setParam(view, SabParam.OscASemitone, 0);
  setParam(view, SabParam.OscAPhaseOffset, 0);
  setParam(view, SabParam.OscARandomPhase, 1);
  setParam(view, SabParam.OscASpectralMorphType, 0);
  setParam(view, SabParam.OscASpectralMorphAmount, 0);

  // Osc B defaults (off)
  setParam(view, SabParam.OscBOn, 0);
  setParam(view, SabParam.OscBWavetableIndex, 0);
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
  setParam(view, SabParam.OscBOctave, 0);
  setParam(view, SabParam.OscBSemitone, 0);
  setParam(view, SabParam.OscBPhaseOffset, 0);
  setParam(view, SabParam.OscBRandomPhase, 1);
  setParam(view, SabParam.OscBSpectralMorphType, 0);
  setParam(view, SabParam.OscBSpectralMorphAmount, 0);

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

  // Osc C defaults (off)
  setParam(view, SabParam.OscCOn, 0);
  setParam(view, SabParam.OscCWavetableIndex, 0);
  setParam(view, SabParam.OscCLevel, 0.8);
  setParam(view, SabParam.OscCFramePosition, 0);
  setParam(view, SabParam.OscCDetune, 0);
  setParam(view, SabParam.OscCUnisonVoices, 1);
  setParam(view, SabParam.OscCUnisonDetune, 20);
  setParam(view, SabParam.OscCUnisonSpread, 0.5);
  setParam(view, SabParam.OscCPan, 0);
  setParam(view, SabParam.OscCWarpType, 0);
  setParam(view, SabParam.OscCWarpAmount, 0);
  setParam(view, SabParam.OscCWarp2Type, 0);
  setParam(view, SabParam.OscCWarp2Amount, 0);
  setParam(view, SabParam.OscCOctave, 0);
  setParam(view, SabParam.OscCSemitone, 0);
  setParam(view, SabParam.OscCPhaseOffset, 0);
  setParam(view, SabParam.OscCRandomPhase, 1);
  setParam(view, SabParam.OscCSpectralMorphType, 0);
  setParam(view, SabParam.OscCSpectralMorphAmount, 0);

  // Filter 2 defaults (passthrough)
  setParam(view, SabParam.Filter2Cutoff, 20000);
  setParam(view, SabParam.Filter2Resonance, 0);
  setParam(view, SabParam.Filter2Drive, 1);
  setParam(view, SabParam.Filter2Type, 0);
  setParam(view, SabParam.Filter2EnvAmount, 0);
  setParam(view, SabParam.FilterOn, 1);
  setParam(view, SabParam.Filter2On, 1);

  // Distortion (off by default)
  setParam(view, SabParam.DistortionDrive, 1);
  setParam(view, SabParam.DistortionTone, 0.5);
  setParam(view, SabParam.DistortionMix, 0);
  setParam(view, SabParam.DistortionMode, 0);

  // Compressor (off by default)
  setParam(view, SabParam.CompThreshold, -12);
  setParam(view, SabParam.CompRatio, 4);
  setParam(view, SabParam.CompAttack, 0.01);
  setParam(view, SabParam.CompRelease, 0.1);
  setParam(view, SabParam.CompMakeup, 0);
  setParam(view, SabParam.CompMix, 0);

  // Flanger (off by default)
  setParam(view, SabParam.FlangerRate, 0.5);
  setParam(view, SabParam.FlangerDepth, 0.5);
  setParam(view, SabParam.FlangerFeedback, 0.5);
  setParam(view, SabParam.FlangerMix, 0);

  // Phaser (off by default)
  setParam(view, SabParam.PhaserRate, 0.5);
  setParam(view, SabParam.PhaserDepth, 0.5);
  setParam(view, SabParam.PhaserFeedback, 0.5);
  setParam(view, SabParam.PhaserMix, 0);

  // EQ (off by default)
  setParam(view, SabParam.EqLowGain, 0);
  setParam(view, SabParam.EqMidGain, 0);
  setParam(view, SabParam.EqHighGain, 0);
  setParam(view, SabParam.EqMix, 0);

  // Misc
  setParam(view, SabParam.DriftAmount, 0);
  setParam(view, SabParam.Macro1, 0);
  setParam(view, SabParam.Macro2, 0);
  setParam(view, SabParam.Macro3, 0);
  setParam(view, SabParam.Macro4, 0);

  return sab;
}
