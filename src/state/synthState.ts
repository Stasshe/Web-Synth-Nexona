import { proxy, subscribe } from "valtio";
import type { ModRoute } from "../audio/dsp/modulation/modMatrix";
import { SabParam, setParam } from "../audio/sab/layout";
import { loadState, saveState } from "../storage/indexeddb";

const DEFAULT_OSC = {
  on: false,
  waveformType: 0,
  waveformName: "Sine",
  customWaveform: null as number[] | null,
  controlPoints: null as unknown[] | null,
  level: 0.7071, // √0.5 = -6dB (Vital default)
  framePosition: 0,
  transpose: 0, // -48 to +48 semitones (replaces octave + semitone)
  tune: 0, // ±100 cents fine tune
  distortionType: 0, // DistortionType enum
  distortionAmount: 0.5,
  distortionPhase: 0.5, // secondary phase param (0-1)
  spectralMorphType: 0,
  spectralMorphAmount: 0,
  // Unison (Vital-style)
  unisonVoices: 1,
  unisonDetune: 0.2, // 0-1 normalized amount
  unisonBlend: 0.8, // 0-1 (center vs detuned mix)
  unisonSpread: 1.0, // stereo spread 0-1
  unisonStackType: 0, // UnisonStackType enum (0-10)
  unisonDetunePower: 1.5, // -5 to +5 voice spacing curve
  unisonDetuneRange: 2, // 0-48 semitones max span
  unisonFrameSpread: 0, // -128 to +128 frames
  unisonSpectralMorphSpread: 0, // -0.5 to +0.5
  unisonDistortionSpread: 0, // -0.5 to +0.5
  phaseOffset: 0,
  randomPhase: 1,
  pan: 0,
  destination: 0, // 0=Filter1, 1=Filter2, 2=Dual, 3=Effects
};

export const synthState = proxy({
  oscillators: {
    a: { ...DEFAULT_OSC, on: true },
    b: { ...DEFAULT_OSC },
    c: { ...DEFAULT_OSC },
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
    type: 0, // model index: 0=Analog..7=Phaser
    blend: -1, // LP↔BP↔HP: -1=LP, 0=BP, +1=HP
    style: 0, // sub-mode index within model
    envAmount: 0,
    input: 0b1111, // bitmask: bit0=oscA, bit1=oscB, bit2=oscC, bit3=noise
  },
  filter2: {
    on: true,
    cutoff: 20000,
    resonance: 0,
    drive: 1,
    type: 0,
    blend: -1,
    style: 0,
    envAmount: 0,
    input: 0b10000, // bitmask: bit4=filter1
  },
  envelopes: {
    amp: { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.3 },
    filter: { attack: 0.01, decay: 0.1, sustain: 0, release: 0.3 },
  },
  lfos: {
    lfo1: { rate: 1, shape: 4, customShape: null as number[] | null, controlPoints: null as unknown[] | null, presetName: "Sine" },
    lfo2: { rate: 1, shape: 4, customShape: null as number[] | null, controlPoints: null as unknown[] | null, presetName: "Sine" },
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

  function syncOscToSAB(
    osc: typeof synthState.oscillators.a,
    slots: {
      on: SabParam;
      wt: SabParam;
      frame: SabParam;
      distPhase: SabParam;
      tune: SabParam;
      voices: SabParam;
      detune: SabParam;
      spread: SabParam;
      level: SabParam;
      pan: SabParam;
      distType: SabParam;
      distAmt: SabParam;
      blend: SabParam;
      stackType: SabParam;
      transpose: SabParam;
      detunePower: SabParam;
      phaseOff: SabParam;
      randPhase: SabParam;
      smType: SabParam;
      smAmt: SabParam;
      detuneRange: SabParam;
      frameSpread: SabParam;
      smSpread: SabParam;
      distSpread: SabParam;
      dest: SabParam;
    },
  ): void {
    setParam(sabView, slots.on, osc.on ? 1 : 0);
    setParam(sabView, slots.wt, osc.waveformType);
    setParam(sabView, slots.frame, osc.framePosition);
    setParam(sabView, slots.distPhase, osc.distortionPhase);
    setParam(sabView, slots.tune, osc.tune);
    setParam(sabView, slots.voices, osc.unisonVoices);
    setParam(sabView, slots.detune, osc.unisonDetune);
    setParam(sabView, slots.spread, osc.unisonSpread);
    setParam(sabView, slots.level, osc.level);
    setParam(sabView, slots.pan, osc.pan);
    setParam(sabView, slots.distType, osc.distortionType);
    setParam(sabView, slots.distAmt, osc.distortionAmount);
    setParam(sabView, slots.blend, osc.unisonBlend);
    setParam(sabView, slots.stackType, osc.unisonStackType);
    setParam(sabView, slots.transpose, osc.transpose);
    setParam(sabView, slots.detunePower, osc.unisonDetunePower);
    setParam(sabView, slots.phaseOff, osc.phaseOffset);
    setParam(sabView, slots.randPhase, osc.randomPhase);
    setParam(sabView, slots.smType, osc.spectralMorphType);
    setParam(sabView, slots.smAmt, osc.spectralMorphAmount);
    setParam(sabView, slots.detuneRange, osc.unisonDetuneRange);
    setParam(sabView, slots.frameSpread, osc.unisonFrameSpread);
    setParam(sabView, slots.smSpread, osc.unisonSpectralMorphSpread);
    setParam(sabView, slots.distSpread, osc.unisonDistortionSpread);
    setParam(sabView, slots.dest, osc.destination);
  }

  const OSC_A_SLOTS = {
    on: SabParam.OscAOn,
    wt: SabParam.OscAWavetableIndex,
    frame: SabParam.OscAFramePosition,
    distPhase: SabParam.OscADistortionPhase,
    tune: SabParam.OscATune,
    voices: SabParam.OscAUnisonVoices,
    detune: SabParam.OscAUnisonDetune,
    spread: SabParam.OscAUnisonSpread,
    level: SabParam.OscALevel,
    pan: SabParam.OscAPan,
    distType: SabParam.OscADistortionType,
    distAmt: SabParam.OscADistortionAmount,
    blend: SabParam.OscAUnisonBlend,
    stackType: SabParam.OscAUnisonStackType,
    transpose: SabParam.OscATranspose,
    detunePower: SabParam.OscAUnisonDetunePower,
    phaseOff: SabParam.OscAPhaseOffset,
    randPhase: SabParam.OscARandomPhase,
    smType: SabParam.OscASpectralMorphType,
    smAmt: SabParam.OscASpectralMorphAmount,
    detuneRange: SabParam.OscADetuneRange,
    frameSpread: SabParam.OscAFrameSpread,
    smSpread: SabParam.OscASpectralMorphSpread,
    distSpread: SabParam.OscADistortionSpread,
    dest: SabParam.OscADestination,
  };

  const OSC_B_SLOTS = {
    on: SabParam.OscBOn,
    wt: SabParam.OscBWavetableIndex,
    frame: SabParam.OscBFramePosition,
    distPhase: SabParam.OscBDistortionPhase,
    tune: SabParam.OscBTune,
    voices: SabParam.OscBUnisonVoices,
    detune: SabParam.OscBUnisonDetune,
    spread: SabParam.OscBUnisonSpread,
    level: SabParam.OscBLevel,
    pan: SabParam.OscBPan,
    distType: SabParam.OscBDistortionType,
    distAmt: SabParam.OscBDistortionAmount,
    blend: SabParam.OscBUnisonBlend,
    stackType: SabParam.OscBUnisonStackType,
    transpose: SabParam.OscBTranspose,
    detunePower: SabParam.OscBUnisonDetunePower,
    phaseOff: SabParam.OscBPhaseOffset,
    randPhase: SabParam.OscBRandomPhase,
    smType: SabParam.OscBSpectralMorphType,
    smAmt: SabParam.OscBSpectralMorphAmount,
    detuneRange: SabParam.OscBDetuneRange,
    frameSpread: SabParam.OscBFrameSpread,
    smSpread: SabParam.OscBSpectralMorphSpread,
    distSpread: SabParam.OscBDistortionSpread,
    dest: SabParam.OscBDestination,
  };

  const OSC_C_SLOTS = {
    on: SabParam.OscCOn,
    wt: SabParam.OscCWavetableIndex,
    frame: SabParam.OscCFramePosition,
    distPhase: SabParam.OscCDistortionPhase,
    tune: SabParam.OscCTune,
    voices: SabParam.OscCUnisonVoices,
    detune: SabParam.OscCUnisonDetune,
    spread: SabParam.OscCUnisonSpread,
    level: SabParam.OscCLevel,
    pan: SabParam.OscCPan,
    distType: SabParam.OscCDistortionType,
    distAmt: SabParam.OscCDistortionAmount,
    blend: SabParam.OscCUnisonBlend,
    stackType: SabParam.OscCUnisonStackType,
    transpose: SabParam.OscCTranspose,
    detunePower: SabParam.OscCUnisonDetunePower,
    phaseOff: SabParam.OscCPhaseOffset,
    randPhase: SabParam.OscCRandomPhase,
    smType: SabParam.OscCSpectralMorphType,
    smAmt: SabParam.OscCSpectralMorphAmount,
    detuneRange: SabParam.OscCDetuneRange,
    frameSpread: SabParam.OscCFrameSpread,
    smSpread: SabParam.OscCSpectralMorphSpread,
    distSpread: SabParam.OscCDistortionSpread,
    dest: SabParam.OscCDestination,
  };

  const syncOscA = () => syncOscToSAB(synthState.oscillators.a, OSC_A_SLOTS);
  const syncOscB = () => syncOscToSAB(synthState.oscillators.b, OSC_B_SLOTS);
  const syncOscC = () => syncOscToSAB(synthState.oscillators.c, OSC_C_SLOTS);

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
    setParam(sabView, SabParam.FilterBlend, f.blend);
    setParam(sabView, SabParam.FilterStyle, f.style);
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
    setParam(sabView, SabParam.Filter2Blend, f.blend);
    setParam(sabView, SabParam.Filter2Style, f.style);
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

/** Restore state from saved data (with backward compat for old schema) */
export function restoreStateFromSavedData(data: unknown): void {
  if (!data || typeof data !== "object") return;

  const saved = data as Record<string, unknown>;

  if (saved.oscillators && typeof saved.oscillators === "object") {
    const oscData = saved.oscillators as Record<string, unknown>;
    for (const key of ["a", "b", "c"] as const) {
      if (oscData[key] && typeof oscData[key] === "object") {
        const raw = oscData[key] as Record<string, unknown>;
        // Backward compat: convert old octave+semitone to transpose
        if ("octave" in raw || "semitone" in raw) {
          const oct = typeof raw.octave === "number" ? raw.octave : 0;
          const semi = typeof raw.semitone === "number" ? raw.semitone : 0;
          raw.transpose = oct * 12 + semi;
          delete raw.octave;
          delete raw.semitone;
        }
        // Backward compat: rename detune → tune
        if ("detune" in raw && !("tune" in raw)) {
          raw.tune = raw.detune;
          delete raw.detune;
        }
        // Backward compat: rename warpType/warpAmount → distortionType/distortionAmount
        if ("warpType" in raw && !("distortionType" in raw)) {
          raw.distortionType = raw.warpType;
          delete raw.warpType;
        }
        if ("warpAmount" in raw && !("distortionAmount" in raw)) {
          raw.distortionAmount = raw.warpAmount;
          delete raw.warpAmount;
        }
        // Remove old warp2 fields
        delete raw.warp2Type;
        delete raw.warp2Amount;
        Object.assign(synthState.oscillators[key], raw);
      }
    }
    if (oscData.sub && typeof oscData.sub === "object") {
      Object.assign(synthState.oscillators.sub, oscData.sub);
    }
  }

  if (saved.noise && typeof saved.noise === "object") Object.assign(synthState.noise, saved.noise);
  if (saved.filter && typeof saved.filter === "object")
    Object.assign(synthState.filter, saved.filter);
  if (saved.filter2 && typeof saved.filter2 === "object")
    Object.assign(synthState.filter2, saved.filter2);

  if (saved.envelopes && typeof saved.envelopes === "object") {
    const envData = saved.envelopes as Record<string, unknown>;
    if (envData.amp && typeof envData.amp === "object")
      Object.assign(synthState.envelopes.amp, envData.amp);
    if (envData.filter && typeof envData.filter === "object")
      Object.assign(synthState.envelopes.filter, envData.filter);
  }
  if (saved.lfos && typeof saved.lfos === "object") {
    const lfosData = saved.lfos as Record<string, unknown>;
    if (lfosData.lfo1 && typeof lfosData.lfo1 === "object")
      Object.assign(synthState.lfos.lfo1, lfosData.lfo1);
    if (lfosData.lfo2 && typeof lfosData.lfo2 === "object")
      Object.assign(synthState.lfos.lfo2, lfosData.lfo2);
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
      if (fxData[key] && typeof fxData[key] === "object")
        Object.assign(synthState.effects[key], fxData[key]);
    }
  }
  if (saved.master && typeof saved.master === "object")
    Object.assign(synthState.master, saved.master);
  if (typeof saved.drift === "number") synthState.drift = saved.drift;
  if (Array.isArray(saved.macros)) synthState.macros = [...saved.macros];
  if (Array.isArray(saved.effectsOrder) && saved.effectsOrder.length === 8) {
    synthState.effectsOrder = [...saved.effectsOrder] as string[];
  }
}

/** Setup auto-save to IndexedDB */
export function setupAutoSave(): () => void {
  let saveTimeout: ReturnType<typeof setTimeout> | null = null;

  const performSave = async () => {
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
