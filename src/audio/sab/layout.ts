export const SAB_SLOT_COUNT = 256;
export const SAB_BYTE_SIZE = SAB_SLOT_COUNT * 4;

export enum SabParam {
  MasterVolume = 0,

  // Oscillator A: 10-29
  OscAOn = 10,
  OscAWavetableIndex = 11,
  OscAFramePosition = 12,
  OscAPitch = 13,
  OscADetune = 14,
  OscAUnisonVoices = 15,
  OscAUnisonDetune = 16,
  OscAUnisonSpread = 17,
  OscALevel = 18,
  OscAPan = 19,
  OscAWarpType = 20,
  OscAWarpAmount = 21,
  OscAWarp2Type = 22,
  OscAWarp2Amount = 23,
  OscAOctave = 24,
  OscASemitone = 25,
  OscAPhaseOffset = 26,
  OscARandomPhase = 27,
  OscASpectralMorphType = 28,
  OscASpectralMorphAmount = 29,

  // Oscillator B: 30-49
  OscBOn = 30,
  OscBWavetableIndex = 31,
  OscBFramePosition = 32,
  OscBPitch = 33,
  OscBDetune = 34,
  OscBUnisonVoices = 35,
  OscBUnisonDetune = 36,
  OscBUnisonSpread = 37,
  OscBLevel = 38,
  OscBPan = 39,
  OscBWarpType = 40,
  OscBWarpAmount = 41,
  OscBWarp2Type = 42,
  OscBWarp2Amount = 43,
  OscBOctave = 44,
  OscBSemitone = 45,
  OscBPhaseOffset = 46,
  OscBRandomPhase = 47,
  OscBSpectralMorphType = 48,
  OscBSpectralMorphAmount = 49,

  // Sub + Noise: 50-59
  SubOn = 50,
  SubOctave = 51,
  SubShape = 52,
  SubLevel = 53,
  NoiseType = 54,
  NoiseLevel = 55,

  // Filter: 60-69
  FilterCutoff = 60,
  FilterResonance = 61,
  FilterDrive = 62,
  FilterType = 63,
  FilterEnvAmount = 64,

  // Amp Envelope: 70-73
  AmpEnvAttack = 70,
  AmpEnvDecay = 71,
  AmpEnvSustain = 72,
  AmpEnvRelease = 73,

  // Filter Envelope: 80-83
  FilterEnvAttack = 80,
  FilterEnvDecay = 81,
  FilterEnvSustain = 82,
  FilterEnvRelease = 83,

  // LFO: 90-99
  Lfo1Rate = 90,
  Lfo1Shape = 91,
  Lfo2Rate = 92,
  Lfo2Shape = 93,

  // Effects: 100-119
  ChorusRate = 100,
  ChorusDepth = 101,
  ChorusMix = 102,
  DelayTime = 103,
  DelayFeedback = 104,
  DelayMix = 105,
  ReverbDecay = 106,
  ReverbMix = 107,

  // Misc: 120+
  DriftAmount = 120,
  Macro1 = 121,
  Macro2 = 122,
  Macro3 = 123,
  Macro4 = 124,

  // Oscillator C: 130-143
  OscCOn = 130,
  OscCWavetableIndex = 131,
  OscCFramePosition = 132,
  OscCPitch = 133,
  OscCDetune = 134,
  OscCUnisonVoices = 135,
  OscCUnisonDetune = 136,
  OscCUnisonSpread = 137,
  OscCLevel = 138,
  OscCPan = 139,
  OscCWarpType = 140,
  OscCWarpAmount = 141,
  OscCWarp2Type = 142,
  OscCWarp2Amount = 143,
  OscCOctave = 144,
  OscCSemitone = 145,
  OscCPhaseOffset = 146,
  OscCRandomPhase = 147,
  OscCSpectralMorphType = 148,
  OscCSpectralMorphAmount = 149,

  // Filter 2: 150-154
  Filter2Cutoff = 150,
  Filter2Resonance = 151,
  Filter2Drive = 152,
  Filter2Type = 153,
  Filter2EnvAmount = 154,

  // Filter on/off: 155-156
  FilterOn = 155,
  Filter2On = 156,

  // Distortion: 160-163
  DistortionDrive = 160,
  DistortionTone = 161,
  DistortionMix = 162,
  DistortionMode = 163,

  // Compressor: 164-170
  CompThreshold = 164,
  CompRatio = 165,
  CompAttack = 166,
  CompRelease = 167,
  CompMakeup = 168,
  CompMix = 169,
  CompKnee = 170,

  // Flanger: 171-174
  FlangerRate = 171,
  FlangerDepth = 172,
  FlangerFeedback = 173,
  FlangerMix = 174,

  // Phaser: 175-178
  PhaserRate = 175,
  PhaserDepth = 176,
  PhaserFeedback = 177,
  PhaserMix = 178,

  // EQ: 179-182
  EqLowGain = 179,
  EqMidGain = 180,
  EqHighGain = 181,
  EqMix = 182,

  // Effects order: 191-198 (value = effect index: 0=dist,1=comp,2=chorus,3=flanger,4=phaser,5=delay,6=reverb,7=eq)
  EffectsOrder0 = 191,
  EffectsOrder1 = 192,
  EffectsOrder2 = 193,
  EffectsOrder3 = 194,
  EffectsOrder4 = 195,
  EffectsOrder5 = 196,
  EffectsOrder6 = 197,
  EffectsOrder7 = 198,

  // Filter input bitmasks: 199-200
  Filter1Input = 199,
  Filter2Input = 200,
}

const f32Buf = new ArrayBuffer(4);
const f32View = new Float32Array(f32Buf);
const i32View = new Int32Array(f32Buf);

export function floatToInt32(value: number): number {
  f32View[0] = value;
  return i32View[0];
}

export function int32ToFloat(value: number): number {
  i32View[0] = value;
  return f32View[0];
}

export function setParam(sab: Int32Array, param: SabParam, value: number): void {
  Atomics.store(sab, param, floatToInt32(value));
}

export function getParam(sab: Int32Array, param: SabParam): number {
  return int32ToFloat(Atomics.load(sab, param));
}
