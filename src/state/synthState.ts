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
      controlPoints: null as unknown[] | null,
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
      controlPoints: null as unknown[] | null,
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
    c: {
      on: false,
      waveformType: 0,
      waveformName: "Sine",
      customWaveform: null as number[] | null,
      controlPoints: null as unknown[] | null,
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
  filter2: {
    cutoff: 20000,
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
    distortion: { drive: 1, tone: 0.5, mix: 0, mode: 0 },
    compressor: { threshold: -12, ratio: 4, attack: 0.01, release: 0.1, makeup: 0, mix: 0 },
    chorus: { rate: 0.5, depth: 0.3, mix: 0 },
    flanger: { rate: 0.5, depth: 0.5, feedback: 0.5, mix: 0 },
    phaser: { rate: 0.5, depth: 0.5, feedback: 0.5, mix: 0 },
    delay: { time: 0.375, feedback: 0.3, mix: 0 },
    reverb: { decay: 0.7, mix: 0 },
    eq: { lowGain: 0, midGain: 0, highGain: 0, mix: 0 },
  },
  master: {
    volume: 0.8,
  },
  drift: 0,
  macros: [0, 0, 0, 0] as number[],
  ui: {
    activePage: "voice" as "voice" | "effects",
    selectedOsc: "a" as "a" | "b" | "c",
    selectedEffectTab: "chorus" as "chorus" | "delay" | "reverb",
  },
});

export function bindStateToSAB(sabView: Int32Array): () => void {
  const unsubs: (() => void)[] = [];

  const syncMaster = () => {
    setParam(sabView, SabParam.MasterVolume, synthState.master.volume);
  };

  const syncOscA = () => {
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
  };

  const syncOscB = () => {
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
  };

  const syncOscC = () => {
    const c = synthState.oscillators.c;
    setParam(sabView, SabParam.OscCOn, c.on ? 1 : 0);
    setParam(sabView, SabParam.OscCWavetableIndex, c.waveformType);
    setParam(sabView, SabParam.OscCLevel, c.level);
    setParam(sabView, SabParam.OscCFramePosition, c.framePosition);
    setParam(sabView, SabParam.OscCDetune, c.detune);
    setParam(sabView, SabParam.OscCUnisonVoices, c.unisonVoices);
    setParam(sabView, SabParam.OscCUnisonDetune, c.unisonDetune);
    setParam(sabView, SabParam.OscCUnisonSpread, c.unisonSpread);
    setParam(sabView, SabParam.OscCPan, c.pan);
    setParam(sabView, SabParam.OscCWarpType, c.warpType);
    setParam(sabView, SabParam.OscCWarpAmount, c.warpAmount);
    setParam(sabView, SabParam.OscCWarp2Type, c.warp2Type);
    setParam(sabView, SabParam.OscCWarp2Amount, c.warp2Amount);
  };

  const syncSub = () => {
    const sub = synthState.oscillators.sub;
    setParam(sabView, SabParam.SubOn, sub.on ? 1 : 0);
    setParam(sabView, SabParam.SubOctave, sub.octave);
    setParam(sabView, SabParam.SubLevel, sub.level);
  };

  const syncNoise = () => {
    setParam(sabView, SabParam.NoiseType, synthState.noise.type);
    setParam(sabView, SabParam.NoiseLevel, synthState.noise.level);
  };

  const syncFilter = () => {
    const f = synthState.filter;
    setParam(sabView, SabParam.FilterCutoff, f.cutoff);
    setParam(sabView, SabParam.FilterResonance, f.resonance);
    setParam(sabView, SabParam.FilterDrive, f.drive);
    setParam(sabView, SabParam.FilterType, f.type);
    setParam(sabView, SabParam.FilterEnvAmount, f.envAmount);
  };

  const syncFilter2 = () => {
    const f = synthState.filter2;
    setParam(sabView, SabParam.Filter2Cutoff, f.cutoff);
    setParam(sabView, SabParam.Filter2Resonance, f.resonance);
    setParam(sabView, SabParam.Filter2Drive, f.drive);
    setParam(sabView, SabParam.Filter2Type, f.type);
    setParam(sabView, SabParam.Filter2EnvAmount, f.envAmount);
  };

  const syncAmpEnv = () => {
    const e = synthState.envelopes.amp;
    setParam(sabView, SabParam.AmpEnvAttack, e.attack);
    setParam(sabView, SabParam.AmpEnvDecay, e.decay);
    setParam(sabView, SabParam.AmpEnvSustain, e.sustain);
    setParam(sabView, SabParam.AmpEnvRelease, e.release);
  };

  const syncFilterEnv = () => {
    const e = synthState.envelopes.filter;
    setParam(sabView, SabParam.FilterEnvAttack, e.attack);
    setParam(sabView, SabParam.FilterEnvDecay, e.decay);
    setParam(sabView, SabParam.FilterEnvSustain, e.sustain);
    setParam(sabView, SabParam.FilterEnvRelease, e.release);
  };

  const syncLfos = () => {
    setParam(sabView, SabParam.Lfo1Rate, synthState.lfos.lfo1.rate);
    setParam(sabView, SabParam.Lfo1Shape, synthState.lfos.lfo1.shape);
    setParam(sabView, SabParam.Lfo2Rate, synthState.lfos.lfo2.rate);
    setParam(sabView, SabParam.Lfo2Shape, synthState.lfos.lfo2.shape);
  };

  const syncEffects = () => {
    const fx = synthState.effects;
    setParam(sabView, SabParam.DistortionDrive, fx.distortion.drive);
    setParam(sabView, SabParam.DistortionTone, fx.distortion.tone);
    setParam(sabView, SabParam.DistortionMix, fx.distortion.mix);
    setParam(sabView, SabParam.DistortionMode, fx.distortion.mode);
    setParam(sabView, SabParam.CompThreshold, fx.compressor.threshold);
    setParam(sabView, SabParam.CompRatio, fx.compressor.ratio);
    setParam(sabView, SabParam.CompAttack, fx.compressor.attack);
    setParam(sabView, SabParam.CompRelease, fx.compressor.release);
    setParam(sabView, SabParam.CompMakeup, fx.compressor.makeup);
    setParam(sabView, SabParam.CompMix, fx.compressor.mix);
    setParam(sabView, SabParam.ChorusRate, fx.chorus.rate);
    setParam(sabView, SabParam.ChorusDepth, fx.chorus.depth);
    setParam(sabView, SabParam.ChorusMix, fx.chorus.mix);
    setParam(sabView, SabParam.FlangerRate, fx.flanger.rate);
    setParam(sabView, SabParam.FlangerDepth, fx.flanger.depth);
    setParam(sabView, SabParam.FlangerFeedback, fx.flanger.feedback);
    setParam(sabView, SabParam.FlangerMix, fx.flanger.mix);
    setParam(sabView, SabParam.PhaserRate, fx.phaser.rate);
    setParam(sabView, SabParam.PhaserDepth, fx.phaser.depth);
    setParam(sabView, SabParam.PhaserFeedback, fx.phaser.feedback);
    setParam(sabView, SabParam.PhaserMix, fx.phaser.mix);
    setParam(sabView, SabParam.DelayTime, fx.delay.time);
    setParam(sabView, SabParam.DelayFeedback, fx.delay.feedback);
    setParam(sabView, SabParam.DelayMix, fx.delay.mix);
    setParam(sabView, SabParam.ReverbDecay, fx.reverb.decay);
    setParam(sabView, SabParam.ReverbMix, fx.reverb.mix);
    setParam(sabView, SabParam.EqLowGain, fx.eq.lowGain);
    setParam(sabView, SabParam.EqMidGain, fx.eq.midGain);
    setParam(sabView, SabParam.EqHighGain, fx.eq.highGain);
    setParam(sabView, SabParam.EqMix, fx.eq.mix);
  };

  const syncMisc = () => {
    setParam(sabView, SabParam.DriftAmount, synthState.drift);
    setParam(sabView, SabParam.Macro1, synthState.macros[0]);
    setParam(sabView, SabParam.Macro2, synthState.macros[1]);
    setParam(sabView, SabParam.Macro3, synthState.macros[2]);
    setParam(sabView, SabParam.Macro4, synthState.macros[3]);
  };

  // Subscribe to future changes
  unsubs.push(subscribe(synthState.master, syncMaster));
  unsubs.push(subscribe(synthState.oscillators.a, syncOscA));
  unsubs.push(subscribe(synthState.oscillators.b, syncOscB));
  unsubs.push(subscribe(synthState.oscillators.c, syncOscC));
  unsubs.push(subscribe(synthState.oscillators.sub, syncSub));
  unsubs.push(subscribe(synthState.noise, syncNoise));
  unsubs.push(subscribe(synthState.filter, syncFilter));
  unsubs.push(subscribe(synthState.filter2, syncFilter2));
  unsubs.push(subscribe(synthState.envelopes.amp, syncAmpEnv));
  unsubs.push(subscribe(synthState.envelopes.filter, syncFilterEnv));
  unsubs.push(subscribe(synthState.lfos, syncLfos));
  unsubs.push(subscribe(synthState.effects, syncEffects));
  unsubs.push(subscribe(synthState, syncMisc));

  // Initial sync: write current state to SAB immediately
  // (needed when state was modified before binding, e.g. patch loaded from URL)
  syncMaster();
  syncOscA();
  syncOscB();
  syncOscC();
  syncSub();
  syncNoise();
  syncFilter();
  syncFilter2();
  syncAmpEnv();
  syncFilterEnv();
  syncLfos();
  syncEffects();
  syncMisc();

  return () => {
    for (const unsub of unsubs) unsub();
  };
}
