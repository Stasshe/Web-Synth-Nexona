import { proxy, subscribe } from "valtio";
import type { ModRoute } from "../audio/dsp/modulation/modMatrix";
import { SabParam, setParam } from "../audio/sab/layout";
import { loadState, saveState } from "../storage/indexeddb";

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
      octave: 0,
      semitone: 0,
      detune: 0,
      unisonVoices: 1,
      unisonDetune: 20,
      unisonSpread: 0.5,
      pan: 0,
      warpType: 0,
      warpAmount: 0,
      warp2Type: 0,
      warp2Amount: 0,
      spectralMorphType: 0,
      spectralMorphAmount: 0,
      phaseOffset: 0,
      randomPhase: 1,
    },
    b: {
      on: false,
      waveformType: 0,
      waveformName: "Sine",
      customWaveform: null as number[] | null,
      controlPoints: null as unknown[] | null,
      level: 0.8,
      framePosition: 0,
      octave: 0,
      semitone: 0,
      detune: 0,
      unisonVoices: 1,
      unisonDetune: 20,
      unisonSpread: 0.5,
      pan: 0,
      warpType: 0,
      warpAmount: 0,
      warp2Type: 0,
      warp2Amount: 0,
      spectralMorphType: 0,
      spectralMorphAmount: 0,
      phaseOffset: 0,
      randomPhase: 1,
    },
    c: {
      on: false,
      waveformType: 0,
      waveformName: "Sine",
      customWaveform: null as number[] | null,
      controlPoints: null as unknown[] | null,
      level: 0.8,
      framePosition: 0,
      octave: 0,
      semitone: 0,
      detune: 0,
      unisonVoices: 1,
      unisonDetune: 20,
      unisonSpread: 0.5,
      pan: 0,
      warpType: 0,
      warpAmount: 0,
      warp2Type: 0,
      warp2Amount: 0,
      spectralMorphType: 0,
      spectralMorphAmount: 0,
      phaseOffset: 0,
      randomPhase: 1,
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
    on: true,
    cutoff: 8000,
    resonance: 0,
    drive: 1,
    type: 0,
    envAmount: 0,
    input: 0b1111, // bitmask: bit0=oscA, bit1=oscB, bit2=oscC, bit3=noise
  },
  filter2: {
    on: true,
    cutoff: 20000,
    resonance: 0,
    drive: 1,
    type: 0,
    envAmount: 0,
    input: 0b10000, // bitmask: bit4=filter1
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
    compressor: {
      threshold: -12,
      ratio: 4,
      attack: 0.01,
      release: 0.1,
      makeup: 0,
      mix: 0,
      knee: 6,
    },
    chorus: { rate: 0.5, depth: 0.3, mix: 0 },
    flanger: { rate: 0.5, depth: 0.5, feedback: 0.5, mix: 0 },
    phaser: { rate: 0.5, depth: 0.5, feedback: 0.5, mix: 0 },
    delay: { time: 0.375, feedback: 0.3, mix: 0 },
    reverb: { decay: 0.7, mix: 0 },
    eq: { lowGain: 0, midGain: 0, highGain: 0, mix: 0 },
  },
  effectsOrder: [
    "distortion",
    "compressor",
    "chorus",
    "flanger",
    "phaser",
    "delay",
    "reverb",
    "eq",
  ] as string[],
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
    setParam(sabView, SabParam.OscAOctave, a.octave);
    setParam(sabView, SabParam.OscASemitone, a.semitone);
    setParam(sabView, SabParam.OscAUnisonVoices, a.unisonVoices);
    setParam(sabView, SabParam.OscAUnisonDetune, a.unisonDetune);
    setParam(sabView, SabParam.OscAUnisonSpread, a.unisonSpread);
    setParam(sabView, SabParam.OscAPan, a.pan);
    setParam(sabView, SabParam.OscAWarpType, a.warpType);
    setParam(sabView, SabParam.OscAWarpAmount, a.warpAmount);
    setParam(sabView, SabParam.OscAWarp2Type, a.warp2Type);
    setParam(sabView, SabParam.OscAWarp2Amount, a.warp2Amount);
    setParam(sabView, SabParam.OscASpectralMorphType, a.spectralMorphType);
    setParam(sabView, SabParam.OscASpectralMorphAmount, a.spectralMorphAmount);
    setParam(sabView, SabParam.OscAPhaseOffset, a.phaseOffset);
    setParam(sabView, SabParam.OscARandomPhase, a.randomPhase);
  };

  const syncOscB = () => {
    const b = synthState.oscillators.b;
    setParam(sabView, SabParam.OscBOn, b.on ? 1 : 0);
    setParam(sabView, SabParam.OscBWavetableIndex, b.waveformType);
    setParam(sabView, SabParam.OscBLevel, b.level);
    setParam(sabView, SabParam.OscBFramePosition, b.framePosition);
    setParam(sabView, SabParam.OscBDetune, b.detune);
    setParam(sabView, SabParam.OscBOctave, b.octave);
    setParam(sabView, SabParam.OscBSemitone, b.semitone);
    setParam(sabView, SabParam.OscBUnisonVoices, b.unisonVoices);
    setParam(sabView, SabParam.OscBUnisonDetune, b.unisonDetune);
    setParam(sabView, SabParam.OscBUnisonSpread, b.unisonSpread);
    setParam(sabView, SabParam.OscBPan, b.pan);
    setParam(sabView, SabParam.OscBWarpType, b.warpType);
    setParam(sabView, SabParam.OscBWarpAmount, b.warpAmount);
    setParam(sabView, SabParam.OscBWarp2Type, b.warp2Type);
    setParam(sabView, SabParam.OscBWarp2Amount, b.warp2Amount);
    setParam(sabView, SabParam.OscBSpectralMorphType, b.spectralMorphType);
    setParam(sabView, SabParam.OscBSpectralMorphAmount, b.spectralMorphAmount);
    setParam(sabView, SabParam.OscBPhaseOffset, b.phaseOffset);
    setParam(sabView, SabParam.OscBRandomPhase, b.randomPhase);
  };

  const syncOscC = () => {
    const c = synthState.oscillators.c;
    setParam(sabView, SabParam.OscCOn, c.on ? 1 : 0);
    setParam(sabView, SabParam.OscCWavetableIndex, c.waveformType);
    setParam(sabView, SabParam.OscCLevel, c.level);
    setParam(sabView, SabParam.OscCFramePosition, c.framePosition);
    setParam(sabView, SabParam.OscCDetune, c.detune);
    setParam(sabView, SabParam.OscCOctave, c.octave);
    setParam(sabView, SabParam.OscCSemitone, c.semitone);
    setParam(sabView, SabParam.OscCUnisonVoices, c.unisonVoices);
    setParam(sabView, SabParam.OscCUnisonDetune, c.unisonDetune);
    setParam(sabView, SabParam.OscCUnisonSpread, c.unisonSpread);
    setParam(sabView, SabParam.OscCPan, c.pan);
    setParam(sabView, SabParam.OscCWarpType, c.warpType);
    setParam(sabView, SabParam.OscCWarpAmount, c.warpAmount);
    setParam(sabView, SabParam.OscCWarp2Type, c.warp2Type);
    setParam(sabView, SabParam.OscCWarp2Amount, c.warp2Amount);
    setParam(sabView, SabParam.OscCSpectralMorphType, c.spectralMorphType);
    setParam(sabView, SabParam.OscCSpectralMorphAmount, c.spectralMorphAmount);
    setParam(sabView, SabParam.OscCPhaseOffset, c.phaseOffset);
    setParam(sabView, SabParam.OscCRandomPhase, c.randomPhase);
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
    setParam(sabView, SabParam.FilterOn, f.on ? 1 : 0);
    setParam(sabView, SabParam.FilterCutoff, f.cutoff);
    setParam(sabView, SabParam.FilterResonance, f.resonance);
    setParam(sabView, SabParam.FilterDrive, f.drive);
    setParam(sabView, SabParam.FilterType, f.type);
    setParam(sabView, SabParam.FilterEnvAmount, f.envAmount);
    setParam(sabView, SabParam.Filter1Input, f.input);
  };

  const syncFilter2 = () => {
    const f = synthState.filter2;
    setParam(sabView, SabParam.Filter2On, f.on ? 1 : 0);
    setParam(sabView, SabParam.Filter2Cutoff, f.cutoff);
    setParam(sabView, SabParam.Filter2Resonance, f.resonance);
    setParam(sabView, SabParam.Filter2Drive, f.drive);
    setParam(sabView, SabParam.Filter2Type, f.type);
    setParam(sabView, SabParam.Filter2EnvAmount, f.envAmount);
    setParam(sabView, SabParam.Filter2Input, f.input);
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
    setParam(sabView, SabParam.CompKnee, fx.compressor.knee);
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

  const EFFECT_NAME_TO_INDEX: Record<string, number> = {
    distortion: 0,
    compressor: 1,
    chorus: 2,
    flanger: 3,
    phaser: 4,
    delay: 5,
    reverb: 6,
    eq: 7,
  };

  const syncEffectsOrder = () => {
    const order = synthState.effectsOrder;
    for (let i = 0; i < 8; i++) {
      const idx = EFFECT_NAME_TO_INDEX[order[i]] ?? i;
      setParam(sabView, SabParam.EffectsOrder0 + i, idx);
    }
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
  unsubs.push(
    subscribe(synthState, () => {
      syncEffectsOrder();
      syncMisc();
    }),
  );

  // Initial sync
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
  syncEffectsOrder();
  syncMisc();

  return () => {
    for (const unsub of unsubs) unsub();
  };
}

/**
 * Restore state from saved data
 */
export function restoreStateFromSavedData(data: unknown): void {
  if (!data || typeof data !== "object") return;

  const saved = data as Record<string, unknown>;

  // Restore oscillators
  if (saved.oscillators && typeof saved.oscillators === "object") {
    const oscData = saved.oscillators as Record<string, unknown>;
    for (const key of ["a", "b", "c"] as const) {
      if (oscData[key] && typeof oscData[key] === "object") {
        Object.assign(synthState.oscillators[key], oscData[key]);
      }
    }
    if (oscData.sub && typeof oscData.sub === "object") {
      Object.assign(synthState.oscillators.sub, oscData.sub);
    }
  }

  // Restore other sections
  if (saved.noise && typeof saved.noise === "object") {
    Object.assign(synthState.noise, saved.noise);
  }
  if (saved.filter && typeof saved.filter === "object") {
    Object.assign(synthState.filter, saved.filter);
  }
  if (saved.filter2 && typeof saved.filter2 === "object") {
    Object.assign(synthState.filter2, saved.filter2);
  }
  if (saved.envelopes && typeof saved.envelopes === "object") {
    const envData = saved.envelopes as Record<string, unknown>;
    if (envData.amp && typeof envData.amp === "object") {
      Object.assign(synthState.envelopes.amp, envData.amp);
    }
    if (envData.filter && typeof envData.filter === "object") {
      Object.assign(synthState.envelopes.filter, envData.filter);
    }
  }
  if (saved.lfos && typeof saved.lfos === "object") {
    const lfosData = saved.lfos as Record<string, unknown>;
    if (lfosData.lfo1 && typeof lfosData.lfo1 === "object") {
      Object.assign(synthState.lfos.lfo1, lfosData.lfo1);
    }
    if (lfosData.lfo2 && typeof lfosData.lfo2 === "object") {
      Object.assign(synthState.lfos.lfo2, lfosData.lfo2);
    }
  }
  if (saved.effects && typeof saved.effects === "object") {
    const fxData = saved.effects as Record<string, unknown>;
    for (const key of [
      "distortion",
      "compressor",
      "chorus",
      "flanger",
      "phaser",
      "delay",
      "reverb",
      "eq",
    ] as const) {
      if (fxData[key] && typeof fxData[key] === "object") {
        Object.assign(synthState.effects[key], fxData[key]);
      }
    }
  }
  if (saved.master && typeof saved.master === "object") {
    Object.assign(synthState.master, saved.master);
  }
  if (typeof saved.drift === "number") {
    synthState.drift = saved.drift;
  }
  if (Array.isArray(saved.macros)) {
    synthState.macros = [...saved.macros];
  }
  if (Array.isArray(saved.effectsOrder) && saved.effectsOrder.length === 8) {
    synthState.effectsOrder = [...saved.effectsOrder] as string[];
  }
}

/**
 * Setup auto-save to IndexedDB
 * Subscribe to all state changes and save
 */
export function setupAutoSave(): () => void {
  let saveTimeout: ReturnType<typeof setTimeout> | null = null;

  const performSave = async () => {
    // Create a plain object copy of the state (excluding custom waveforms which are large)
    const stateCopy = {
      oscillators: {
        a: { ...synthState.oscillators.a, customWaveform: null },
        b: { ...synthState.oscillators.b, customWaveform: null },
        c: { ...synthState.oscillators.c, customWaveform: null },
        sub: { ...synthState.oscillators.sub, customWaveform: null },
      },
      noise: { ...synthState.noise },
      filter: { ...synthState.filter },
      filter2: { ...synthState.filter2 },
      envelopes: {
        amp: { ...synthState.envelopes.amp },
        filter: { ...synthState.envelopes.filter },
      },
      lfos: {
        lfo1: { ...synthState.lfos.lfo1 },
        lfo2: { ...synthState.lfos.lfo2 },
      },
      effects: {
        distortion: { ...synthState.effects.distortion },
        compressor: { ...synthState.effects.compressor },
        chorus: { ...synthState.effects.chorus },
        flanger: { ...synthState.effects.flanger },
        phaser: { ...synthState.effects.phaser },
        delay: { ...synthState.effects.delay },
        reverb: { ...synthState.effects.reverb },
        eq: { ...synthState.effects.eq },
      },
      master: { ...synthState.master },
      drift: synthState.drift,
      macros: [...synthState.macros],
      effectsOrder: [...synthState.effectsOrder],
    };

    await saveState(stateCopy);
  };

  const debouncedSave = () => {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(performSave, 1000);
  };

  // Subscribe to all top-level state changes
  const unsubs: (() => void)[] = [];
  unsubs.push(subscribe(synthState.oscillators, debouncedSave));
  unsubs.push(subscribe(synthState.noise, debouncedSave));
  unsubs.push(subscribe(synthState.filter, debouncedSave));
  unsubs.push(subscribe(synthState.filter2, debouncedSave));
  unsubs.push(subscribe(synthState.envelopes, debouncedSave));
  unsubs.push(subscribe(synthState.lfos, debouncedSave));
  unsubs.push(subscribe(synthState.effects, debouncedSave));
  unsubs.push(subscribe(synthState.master, debouncedSave));
  unsubs.push(
    subscribe(synthState, () => {
      if (synthState.drift || synthState.macros) debouncedSave();
    }),
  );

  return () => {
    if (saveTimeout) clearTimeout(saveTimeout);
    for (const unsub of unsubs) unsub();
  };
}
