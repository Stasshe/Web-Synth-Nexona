import { proxy, subscribe } from "valtio";
import type { ModRoute } from "../audio/dsp/modulation/modMatrix";
import { SabParam, setParam } from "../audio/sab/layout";

export const synthState = proxy({
  oscillators: {
    a: {
      on: true,
      waveformType: 0,
      waveformName: "Sine",
      customWaveform: null as number[] | null,
      level: 0.8,
      framePosition: 0,
      detune: 0,
      unisonVoices: 1,
      unisonDetune: 20,
      unisonSpread: 0.5,
      pan: 0,
      warpType: 0,
      warpAmount: 0,
      warp2Type: 0,
      warp2Amount: 0,
    },
    b: {
      on: false,
      waveformType: 0,
      waveformName: "Sine",
      customWaveform: null as number[] | null,
      level: 0.8,
      framePosition: 0,
      detune: 0,
      unisonVoices: 1,
      unisonDetune: 20,
      unisonSpread: 0.5,
      pan: 0,
      warpType: 0,
      warpAmount: 0,
      warp2Type: 0,
      warp2Amount: 0,
    },
    sub: {
      on: false,
      octave: -1,
      level: 0.5,
      waveformName: "Sine",
      customWaveform: null as number[] | null,
      controlPoints: null as unknown[] | null,
    },
  },
  noise: {
    type: 0,
    level: 0,
  },
  filter: {
    cutoff: 8000,
    resonance: 0,
    drive: 1,
    type: 0,
    envAmount: 0,
  },
  envelopes: {
    amp: { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.3 },
    filter: { attack: 0.01, decay: 0.1, sustain: 0, release: 0.3 },
  },
  lfos: {
    lfo1: { rate: 1, shape: 0 },
    lfo2: { rate: 1, shape: 0 },
  },
  modulations: [] as ModRoute[],
  effects: {
    chorus: { rate: 0.5, depth: 0.3, mix: 0 },
    delay: { time: 0.375, feedback: 0.3, mix: 0 },
    reverb: { decay: 0.7, mix: 0 },
  },
  master: {
    volume: 0.8,
  },
  drift: 0,
  macros: [0, 0, 0, 0] as number[],
  ui: {
    selectedOsc: "a" as "a" | "b",
    selectedEffectTab: "chorus" as "chorus" | "delay" | "reverb",
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
    subscribe(synthState.oscillators.a, () => {
      const a = synthState.oscillators.a;
      setParam(sabView, SabParam.OscAOn, a.on ? 1 : 0);
      setParam(sabView, SabParam.OscAWavetableIndex, a.waveformType);
      setParam(sabView, SabParam.OscALevel, a.level);
      setParam(sabView, SabParam.OscAFramePosition, a.framePosition);
      setParam(sabView, SabParam.OscADetune, a.detune);
      setParam(sabView, SabParam.OscAUnisonVoices, a.unisonVoices);
      setParam(sabView, SabParam.OscAUnisonDetune, a.unisonDetune);
      setParam(sabView, SabParam.OscAUnisonSpread, a.unisonSpread);
      setParam(sabView, SabParam.OscAPan, a.pan);
      setParam(sabView, SabParam.OscAWarpType, a.warpType);
      setParam(sabView, SabParam.OscAWarpAmount, a.warpAmount);
      setParam(sabView, SabParam.OscAWarp2Type, a.warp2Type);
      setParam(sabView, SabParam.OscAWarp2Amount, a.warp2Amount);
    }),
  );

  unsubs.push(
    subscribe(synthState.oscillators.b, () => {
      const b = synthState.oscillators.b;
      setParam(sabView, SabParam.OscBOn, b.on ? 1 : 0);
      setParam(sabView, SabParam.OscBWavetableIndex, b.waveformType);
      setParam(sabView, SabParam.OscBLevel, b.level);
      setParam(sabView, SabParam.OscBFramePosition, b.framePosition);
      setParam(sabView, SabParam.OscBDetune, b.detune);
      setParam(sabView, SabParam.OscBUnisonVoices, b.unisonVoices);
      setParam(sabView, SabParam.OscBUnisonDetune, b.unisonDetune);
      setParam(sabView, SabParam.OscBUnisonSpread, b.unisonSpread);
      setParam(sabView, SabParam.OscBPan, b.pan);
      setParam(sabView, SabParam.OscBWarpType, b.warpType);
      setParam(sabView, SabParam.OscBWarpAmount, b.warpAmount);
      setParam(sabView, SabParam.OscBWarp2Type, b.warp2Type);
      setParam(sabView, SabParam.OscBWarp2Amount, b.warp2Amount);
    }),
  );

  unsubs.push(
    subscribe(synthState.oscillators.sub, () => {
      const sub = synthState.oscillators.sub;
      setParam(sabView, SabParam.SubOn, sub.on ? 1 : 0);
      setParam(sabView, SabParam.SubOctave, sub.octave);
      setParam(sabView, SabParam.SubLevel, sub.level);
    }),
  );

  unsubs.push(
    subscribe(synthState.noise, () => {
      setParam(sabView, SabParam.NoiseType, synthState.noise.type);
      setParam(sabView, SabParam.NoiseLevel, synthState.noise.level);
    }),
  );

  unsubs.push(
    subscribe(synthState.filter, () => {
      const f = synthState.filter;
      setParam(sabView, SabParam.FilterCutoff, f.cutoff);
      setParam(sabView, SabParam.FilterResonance, f.resonance);
      setParam(sabView, SabParam.FilterDrive, f.drive);
      setParam(sabView, SabParam.FilterType, f.type);
      setParam(sabView, SabParam.FilterEnvAmount, f.envAmount);
    }),
  );

  unsubs.push(
    subscribe(synthState.envelopes.amp, () => {
      const e = synthState.envelopes.amp;
      setParam(sabView, SabParam.AmpEnvAttack, e.attack);
      setParam(sabView, SabParam.AmpEnvDecay, e.decay);
      setParam(sabView, SabParam.AmpEnvSustain, e.sustain);
      setParam(sabView, SabParam.AmpEnvRelease, e.release);
    }),
  );

  unsubs.push(
    subscribe(synthState.envelopes.filter, () => {
      const e = synthState.envelopes.filter;
      setParam(sabView, SabParam.FilterEnvAttack, e.attack);
      setParam(sabView, SabParam.FilterEnvDecay, e.decay);
      setParam(sabView, SabParam.FilterEnvSustain, e.sustain);
      setParam(sabView, SabParam.FilterEnvRelease, e.release);
    }),
  );

  unsubs.push(
    subscribe(synthState.lfos, () => {
      setParam(sabView, SabParam.Lfo1Rate, synthState.lfos.lfo1.rate);
      setParam(sabView, SabParam.Lfo1Shape, synthState.lfos.lfo1.shape);
      setParam(sabView, SabParam.Lfo2Rate, synthState.lfos.lfo2.rate);
      setParam(sabView, SabParam.Lfo2Shape, synthState.lfos.lfo2.shape);
    }),
  );

  unsubs.push(
    subscribe(synthState.effects, () => {
      const fx = synthState.effects;
      setParam(sabView, SabParam.ChorusRate, fx.chorus.rate);
      setParam(sabView, SabParam.ChorusDepth, fx.chorus.depth);
      setParam(sabView, SabParam.ChorusMix, fx.chorus.mix);
      setParam(sabView, SabParam.DelayTime, fx.delay.time);
      setParam(sabView, SabParam.DelayFeedback, fx.delay.feedback);
      setParam(sabView, SabParam.DelayMix, fx.delay.mix);
      setParam(sabView, SabParam.ReverbDecay, fx.reverb.decay);
      setParam(sabView, SabParam.ReverbMix, fx.reverb.mix);
    }),
  );

  unsubs.push(
    subscribe(synthState, () => {
      setParam(sabView, SabParam.DriftAmount, synthState.drift);
      setParam(sabView, SabParam.Macro1, synthState.macros[0]);
      setParam(sabView, SabParam.Macro2, synthState.macros[1]);
      setParam(sabView, SabParam.Macro3, synthState.macros[2]);
      setParam(sabView, SabParam.Macro4, synthState.macros[3]);
    }),
  );

  return () => {
    for (const unsub of unsubs) unsub();
  };
}
