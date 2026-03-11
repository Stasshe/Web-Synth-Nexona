export const SAB_SLOT_COUNT = 256;
export const SAB_BYTE_SIZE = SAB_SLOT_COUNT * 4;

export const enum SabParam {
  MasterVolume = 0,

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

  FilterCutoff = 60,
  FilterResonance = 61,
  FilterDrive = 62,
  FilterType = 63,
  FilterEnvAmount = 64,

  AmpEnvAttack = 70,
  AmpEnvDecay = 71,
  AmpEnvSustain = 72,
  AmpEnvRelease = 73,
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
