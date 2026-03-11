import { proxy, subscribe } from "valtio";
import { SabParam, setParam } from "../audio/sab/layout";

export const synthState = proxy({
  oscillator: {
    on: true,
    level: 0.8,
    pan: 0,
  },
  filter: {
    cutoff: 8000,
    resonance: 0,
    drive: 1,
    type: 0,
  },
  envelope: {
    attack: 0.01,
    decay: 0.1,
    sustain: 0.7,
    release: 0.3,
  },
  master: {
    volume: 0.8,
  },
});

export function bindStateToSAB(sabView: Int32Array): () => void {
  const unsubs: (() => void)[] = [];

  unsubs.push(
    subscribe(synthState.master, () => {
      setParam(sabView, SabParam.MasterVolume, synthState.master.volume);
    }),
  );

  unsubs.push(
    subscribe(synthState.oscillator, () => {
      setParam(sabView, SabParam.OscAOn, synthState.oscillator.on ? 1 : 0);
      setParam(sabView, SabParam.OscALevel, synthState.oscillator.level);
      setParam(sabView, SabParam.OscAPan, synthState.oscillator.pan);
    }),
  );

  unsubs.push(
    subscribe(synthState.filter, () => {
      setParam(sabView, SabParam.FilterCutoff, synthState.filter.cutoff);
      setParam(sabView, SabParam.FilterResonance, synthState.filter.resonance);
      setParam(sabView, SabParam.FilterDrive, synthState.filter.drive);
      setParam(sabView, SabParam.FilterType, synthState.filter.type);
    }),
  );

  unsubs.push(
    subscribe(synthState.envelope, () => {
      setParam(sabView, SabParam.AmpEnvAttack, synthState.envelope.attack);
      setParam(sabView, SabParam.AmpEnvDecay, synthState.envelope.decay);
      setParam(sabView, SabParam.AmpEnvSustain, synthState.envelope.sustain);
      setParam(sabView, SabParam.AmpEnvRelease, synthState.envelope.release);
    }),
  );

  return () => {
    for (const unsub of unsubs) unsub();
  };
}
