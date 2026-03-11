import { SAB_BYTE_SIZE, SabParam, setParam } from "./layout";

export function createSAB(): SharedArrayBuffer {
  const sab = new SharedArrayBuffer(SAB_BYTE_SIZE);
  const view = new Int32Array(sab);

  // Set defaults
  setParam(view, SabParam.MasterVolume, 0.8);
  setParam(view, SabParam.OscAOn, 1);
  setParam(view, SabParam.OscALevel, 0.8);
  setParam(view, SabParam.OscAPan, 0);
  setParam(view, SabParam.FilterCutoff, 8000);
  setParam(view, SabParam.FilterResonance, 0);
  setParam(view, SabParam.FilterDrive, 1);
  setParam(view, SabParam.FilterType, 0);
  setParam(view, SabParam.AmpEnvAttack, 0.01);
  setParam(view, SabParam.AmpEnvDecay, 0.1);
  setParam(view, SabParam.AmpEnvSustain, 0.7);
  setParam(view, SabParam.AmpEnvRelease, 0.3);

  return sab;
}
