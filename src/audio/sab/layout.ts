export const SAB_SLOT_COUNT = 256;
export const SAB_BYTE_SIZE = SAB_SLOT_COUNT * 4;

export enum SabParam {
  MasterVolume = 0,

  // Oscillator A: 10-29
  OscAOn = 10,
  OscAWavetableIndex = 11,
  OscAFramePosition = 12,
  OscADistortionPhase = 13, // repurposed from OscAPitch (was unused)
  OscATune = 14, // fine tune ±100 cents (same slot as old OscADetune)
  OscAUnisonVoices = 15,
  OscAUnisonDetune = 16, // 0-1 normalized detune amount
  OscAUnisonSpread = 17, // stereo spread 0-1
  OscALevel = 18,
  OscAPan = 19,
  OscADistortionType = 20, // was OscAWarpType
  OscADistortionAmount = 21, // was OscAWarpAmount
  OscAUnisonBlend = 22, // repurposed from OscAWarp2Type
  OscAUnisonStackType = 23, // repurposed from OscAWarp2Amount
  OscATranspose = 24, // -48 to +48 semitones (replaces old OscAOctave)
  OscAUnisonDetunePower = 25, // -5 to +5 (replaces old OscASemitone)
  OscAPhaseOffset = 26,
  OscARandomPhase = 27,
  OscASpectralMorphType = 28,
  OscASpectralMorphAmount = 29,

  // Oscillator B: 30-49
  OscBOn = 30,
  OscBWavetableIndex = 31,
  OscBFramePosition = 32,
  OscBDistortionPhase = 33,
  OscBTune = 34,
  OscBUnisonVoices = 35,
  OscBUnisonDetune = 36,
  OscBUnisonSpread = 37,
  OscBLevel = 38,
  OscBPan = 39,
  OscBDistortionType = 40,
  OscBDistortionAmount = 41,
  OscBUnisonBlend = 42,
  OscBUnisonStackType = 43,
  OscBTranspose = 44,
  OscBUnisonDetunePower = 45,
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
  FilterBlend = 65, // LP↔BP↔HP blend: -1=LP, 0=BP, +1=HP
  FilterStyle = 66, // sub-mode index within the model

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

  // Oscillator C: 130-149
  OscCOn = 130,
  OscCWavetableIndex = 131,
  OscCFramePosition = 132,
  OscCDistortionPhase = 133,
  OscCTune = 134,
  OscCUnisonVoices = 135,
  OscCUnisonDetune = 136,
  OscCUnisonSpread = 137,
  OscCLevel = 138,
  OscCPan = 139,
  OscCDistortionType = 140,
  OscCDistortionAmount = 141,
  OscCUnisonBlend = 142,
  OscCUnisonStackType = 143,
  OscCTranspose = 144,
  OscCUnisonDetunePower = 145,
  OscCPhaseOffset = 146,
  OscCRandomPhase = 147,
  OscCSpectralMorphType = 148,
  OscCSpectralMorphAmount = 149,

  // Filter 2: 150-158
  Filter2Cutoff = 150,
  Filter2Resonance = 151,
  Filter2Drive = 152,
  Filter2Type = 153,
  Filter2EnvAmount = 154,

  // Filter on/off: 155-156
  FilterOn = 155,
  Filter2On = 156,

  // Filter 2 blend/style: 157-158
  Filter2Blend = 157,
  Filter2Style = 158,

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

  // Effects order: 191-198
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

  // Extended oscillator params: 201-215
  OscADetuneRange = 201, // 0-48 semitones
  OscAFrameSpread = 202, // stored as -128 to +128
  OscASpectralMorphSpread = 203, // -0.5 to +0.5
  OscADistortionSpread = 204, // -0.5 to +0.5
  OscADestination = 205, // 0=Filter1, 1=Filter2, 2=Dual, 3=Effects

  OscBDetuneRange = 206,
  OscBFrameSpread = 207,
  OscBSpectralMorphSpread = 208,
  OscBDistortionSpread = 209,
  OscBDestination = 210,

  OscCDetuneRange = 211,
  OscCFrameSpread = 212,
  OscCSpectralMorphSpread = 213,
  OscCDistortionSpread = 214,
  OscCDestination = 215,
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
