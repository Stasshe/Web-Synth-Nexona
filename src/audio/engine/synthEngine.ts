import { EffectsChain, type EffectsParams } from "../dsp/effects/effectsChain";
import { LFO, type LfoShape } from "../dsp/lfo/lfo";
import type { ModRoute } from "../dsp/modulation/modMatrix";
import { SpectralMorphProcessor } from "../dsp/spectralMorph/spectralMorphProcessor";
import type { SpectralMorphType } from "../dsp/spectralMorph/spectralMorphTypes";
import { NoiseType } from "../dsp/utils/noise";
import { ParamSmoother } from "../dsp/utils/smoothing";
import { WarpType } from "../dsp/warp/warpTypes";
import { type Wavetable, generateWavetableByIndex } from "../dsp/wavetable/wavetableEngine";
import { PRESET_COUNT } from "../dsp/wavetable/wavetablePresets";
import { SabParam, getParam } from "../sab/layout";
import type { VoiceParams } from "./voice";
import { VoiceManager } from "./voiceManager";

const BLOCK_SIZE = 128;

export class SynthEngine {
  private voiceManager: VoiceManager;
  private effectsChain: EffectsChain;
  private sab: Int32Array | null = null;
  private sampleRate: number;
  private masterVolume: ParamSmoother;

  // Source wavetables (before spectral morph)
  private sourceWtA: Wavetable;
  private sourceWtB: Wavetable;
  private sourceWtC: Wavetable;
  private wavetableSub: Wavetable;
  private wtTypeA = 0;
  private wtTypeB = 0;
  private wtTypeC = 0;

  // Spectral morph processors
  private spectralMorphA = new SpectralMorphProcessor();
  private spectralMorphB = new SpectralMorphProcessor();
  private spectralMorphC = new SpectralMorphProcessor();
  private prevMorphTypeA = 0;
  private prevMorphAmountA = -1;
  private prevMorphTypeB = 0;
  private prevMorphAmountB = -1;
  private prevMorphTypeC = 0;
  private prevMorphAmountC = -1;

  private lfo1: LFO;
  private lfo2: LFO;
  private macros = [0, 0, 0, 0];

  private voiceParams: VoiceParams = {
    oscAOn: true,
    oscALevel: 0.8,
    oscAFramePosition: 0,
    oscADetune: 0,
    oscAOctave: 0,
    oscASemitone: 0,
    oscAPhaseOffset: 0,
    oscARandomPhase: 1,
    oscAUnisonVoices: 1,
    oscAUnisonDetune: 20,
    oscAUnisonSpread: 0.5,
    oscAWarpType: WarpType.NONE,
    oscAWarpAmount: 0,
    oscAWarp2Type: WarpType.NONE,
    oscAWarp2Amount: 0,

    oscBOn: false,
    oscBLevel: 0.8,
    oscBFramePosition: 0,
    oscBDetune: 0,
    oscBOctave: 0,
    oscBSemitone: 0,
    oscBPhaseOffset: 0,
    oscBRandomPhase: 1,
    oscBUnisonVoices: 1,
    oscBUnisonDetune: 20,
    oscBUnisonSpread: 0.5,
    oscBWarpType: WarpType.NONE,
    oscBWarpAmount: 0,
    oscBWarp2Type: WarpType.NONE,
    oscBWarp2Amount: 0,

    oscCOn: false,
    oscCLevel: 0.8,
    oscCFramePosition: 0,
    oscCDetune: 0,
    oscCOctave: 0,
    oscCSemitone: 0,
    oscCPhaseOffset: 0,
    oscCRandomPhase: 1,
    oscCUnisonVoices: 1,
    oscCUnisonDetune: 20,
    oscCUnisonSpread: 0.5,
    oscCWarpType: WarpType.NONE,
    oscCWarpAmount: 0,
    oscCWarp2Type: WarpType.NONE,
    oscCWarp2Amount: 0,

    subOn: false,
    subOctave: -1,
    subLevel: 0.5,

    noiseType: NoiseType.WHITE,
    noiseLevel: 0,

    filterCutoff: 8000,
    filterResonance: 0,
    filterDrive: 1,
    filterType: 0,
    filterEnvAmount: 0,
    filterOn: true,

    filter2Cutoff: 20000,
    filter2Resonance: 0,
    filter2Drive: 1,
    filter2Type: 0,
    filter2EnvAmount: 0,
    filter2On: true,

    ampAttack: 0.01,
    ampDecay: 0.1,
    ampSustain: 0.7,
    ampRelease: 0.3,

    filterEnvAttack: 0.01,
    filterEnvDecay: 0.1,
    filterEnvSustain: 0,
    filterEnvRelease: 0.3,

    driftAmount: 0,
  };

  private effectsParams: EffectsParams = {
    distortionDrive: 1,
    distortionTone: 0.5,
    distortionMix: 0,
    distortionMode: 0,

    compThreshold: -12,
    compRatio: 4,
    compAttack: 0.01,
    compRelease: 0.1,
    compMakeup: 0,
    compMix: 0,

    chorusRate: 0.5,
    chorusDepth: 0.3,
    chorusMix: 0,

    flangerRate: 0.5,
    flangerDepth: 0.5,
    flangerFeedback: 0.5,
    flangerMix: 0,

    phaserRate: 0.5,
    phaserDepth: 0.5,
    phaserFeedback: 0.5,
    phaserMix: 0,

    delayTime: 0.375,
    delayFeedback: 0.3,
    delayMix: 0,

    reverbDecay: 0.7,
    reverbMix: 0,

    eqLowGain: 0,
    eqMidGain: 0,
    eqHighGain: 0,
    eqMix: 0,
  };

  constructor(sampleRate: number) {
    this.sampleRate = sampleRate;
    this.voiceManager = new VoiceManager(sampleRate);
    this.effectsChain = new EffectsChain(sampleRate);
    this.masterVolume = new ParamSmoother(0.8);
    this.sourceWtA = generateWavetableByIndex(0, 2048);
    this.sourceWtB = generateWavetableByIndex(0, 2048);
    this.sourceWtC = generateWavetableByIndex(0, 2048);
    const subFullTable = generateWavetableByIndex(0, 2048);
    this.wavetableSub = { frames: [subFullTable.frames[0]], tableSize: 2048, numFrames: 1 };
    this.lfo1 = new LFO(sampleRate, BLOCK_SIZE);
    this.lfo2 = new LFO(sampleRate, BLOCK_SIZE);

    this.spectralMorphA.setSource(this.sourceWtA);
    this.spectralMorphB.setSource(this.sourceWtB);
    this.spectralMorphC.setSource(this.sourceWtC);

    this.voiceManager.setWavetableA(this.sourceWtA);
    this.voiceManager.setWavetableB(this.sourceWtB);
    this.voiceManager.setWavetableC(this.sourceWtC);
    this.voiceManager.setWavetableSub(this.wavetableSub);
  }

  setSAB(sab: Int32Array): void {
    this.sab = sab;
  }

  setWavetableA(wt: Wavetable): void {
    this.sourceWtA = wt;
    this.spectralMorphA.setSource(wt);
    const morphed = this.spectralMorphA.getMorphed(
      this.prevMorphTypeA as SpectralMorphType,
      this.prevMorphAmountA < 0 ? 0 : this.prevMorphAmountA,
    );
    this.voiceManager.setWavetableA(morphed ?? wt);
  }

  setWavetableB(wt: Wavetable): void {
    this.sourceWtB = wt;
    this.spectralMorphB.setSource(wt);
    const morphed = this.spectralMorphB.getMorphed(
      this.prevMorphTypeB as SpectralMorphType,
      this.prevMorphAmountB < 0 ? 0 : this.prevMorphAmountB,
    );
    this.voiceManager.setWavetableB(morphed ?? wt);
  }

  setWavetableC(wt: Wavetable): void {
    this.sourceWtC = wt;
    this.spectralMorphC.setSource(wt);
    const morphed = this.spectralMorphC.getMorphed(
      this.prevMorphTypeC as SpectralMorphType,
      this.prevMorphAmountC < 0 ? 0 : this.prevMorphAmountC,
    );
    this.voiceManager.setWavetableC(morphed ?? wt);
  }

  setWavetableSub(wt: Wavetable): void {
    this.wavetableSub = wt;
    this.voiceManager.setWavetableSub(wt);
  }

  setModRoutes(routes: ModRoute[]): void {
    this.voiceManager.setModRoutes(routes);
  }

  setMacros(macros: number[]): void {
    this.macros = macros;
  }

  noteOn(note: number, velocity: number): void {
    this.voiceManager.noteOn(note, velocity);
  }

  noteOff(note: number): void {
    this.voiceManager.noteOff(note);
  }

  processBlock(output: Float32Array[]): void {
    const left = output[0];
    const right = output[1];
    const blockSize = left.length;

    this.readParams();

    const lfo1Val = this.lfo1.process();
    const lfo2Val = this.lfo2.process();
    this.voiceManager.setLfoValues(lfo1Val, lfo2Val, this.macros);
    this.voiceManager.setParams(this.voiceParams);
    this.effectsChain.setParams(this.effectsParams);

    for (let i = 0; i < blockSize; i++) {
      let [l, r] = this.voiceManager.processSample();
      [l, r] = this.effectsChain.process(l, r);
      const master = this.masterVolume.tick();
      left[i] = l * master;
      right[i] = r * master;
    }
  }

  private readParams(): void {
    if (!this.sab) return;

    this.masterVolume.setTarget(getParam(this.sab, SabParam.MasterVolume));

    // Osc A
    this.voiceParams.oscAOn = getParam(this.sab, SabParam.OscAOn) > 0.5;
    this.voiceParams.oscALevel = getParam(this.sab, SabParam.OscALevel);
    this.voiceParams.oscAFramePosition = getParam(this.sab, SabParam.OscAFramePosition);
    this.voiceParams.oscADetune = getParam(this.sab, SabParam.OscADetune);
    this.voiceParams.oscAOctave = Math.round(getParam(this.sab, SabParam.OscAOctave));
    this.voiceParams.oscASemitone = Math.round(getParam(this.sab, SabParam.OscASemitone));
    this.voiceParams.oscAPhaseOffset = getParam(this.sab, SabParam.OscAPhaseOffset);
    this.voiceParams.oscARandomPhase = getParam(this.sab, SabParam.OscARandomPhase);
    this.voiceParams.oscAUnisonVoices = getParam(this.sab, SabParam.OscAUnisonVoices);
    this.voiceParams.oscAUnisonDetune = getParam(this.sab, SabParam.OscAUnisonDetune);
    this.voiceParams.oscAUnisonSpread = getParam(this.sab, SabParam.OscAUnisonSpread);
    this.voiceParams.oscAWarpType = getParam(this.sab, SabParam.OscAWarpType) as WarpType;
    this.voiceParams.oscAWarpAmount = getParam(this.sab, SabParam.OscAWarpAmount);
    this.voiceParams.oscAWarp2Type = getParam(this.sab, SabParam.OscAWarp2Type) as WarpType;
    this.voiceParams.oscAWarp2Amount = getParam(this.sab, SabParam.OscAWarp2Amount);

    const newWtTypeA = Math.round(getParam(this.sab, SabParam.OscAWavetableIndex));
    if (newWtTypeA !== this.wtTypeA) {
      this.wtTypeA = newWtTypeA;
      if (newWtTypeA >= 0 && newWtTypeA < PRESET_COUNT) {
        this.setWavetableA(generateWavetableByIndex(newWtTypeA, 2048));
      }
    }

    const morphTypeA = Math.round(getParam(this.sab, SabParam.OscASpectralMorphType));
    const morphAmountA = getParam(this.sab, SabParam.OscASpectralMorphAmount);
    if (
      morphTypeA !== this.prevMorphTypeA ||
      Math.abs(morphAmountA - this.prevMorphAmountA) > 0.007
    ) {
      this.prevMorphTypeA = morphTypeA;
      this.prevMorphAmountA = morphAmountA;
      const morphed = this.spectralMorphA.getMorphed(morphTypeA as SpectralMorphType, morphAmountA);
      if (morphed) this.voiceManager.setWavetableA(morphed);
    }

    // Osc B
    this.voiceParams.oscBOn = getParam(this.sab, SabParam.OscBOn) > 0.5;
    this.voiceParams.oscBLevel = getParam(this.sab, SabParam.OscBLevel);
    this.voiceParams.oscBFramePosition = getParam(this.sab, SabParam.OscBFramePosition);
    this.voiceParams.oscBDetune = getParam(this.sab, SabParam.OscBDetune);
    this.voiceParams.oscBOctave = Math.round(getParam(this.sab, SabParam.OscBOctave));
    this.voiceParams.oscBSemitone = Math.round(getParam(this.sab, SabParam.OscBSemitone));
    this.voiceParams.oscBPhaseOffset = getParam(this.sab, SabParam.OscBPhaseOffset);
    this.voiceParams.oscBRandomPhase = getParam(this.sab, SabParam.OscBRandomPhase);
    this.voiceParams.oscBUnisonVoices = getParam(this.sab, SabParam.OscBUnisonVoices);
    this.voiceParams.oscBUnisonDetune = getParam(this.sab, SabParam.OscBUnisonDetune);
    this.voiceParams.oscBUnisonSpread = getParam(this.sab, SabParam.OscBUnisonSpread);
    this.voiceParams.oscBWarpType = getParam(this.sab, SabParam.OscBWarpType) as WarpType;
    this.voiceParams.oscBWarpAmount = getParam(this.sab, SabParam.OscBWarpAmount);
    this.voiceParams.oscBWarp2Type = getParam(this.sab, SabParam.OscBWarp2Type) as WarpType;
    this.voiceParams.oscBWarp2Amount = getParam(this.sab, SabParam.OscBWarp2Amount);

    const newWtTypeB = Math.round(getParam(this.sab, SabParam.OscBWavetableIndex));
    if (newWtTypeB !== this.wtTypeB) {
      this.wtTypeB = newWtTypeB;
      if (newWtTypeB >= 0 && newWtTypeB < PRESET_COUNT) {
        this.setWavetableB(generateWavetableByIndex(newWtTypeB, 2048));
      }
    }

    const morphTypeB = Math.round(getParam(this.sab, SabParam.OscBSpectralMorphType));
    const morphAmountB = getParam(this.sab, SabParam.OscBSpectralMorphAmount);
    if (
      morphTypeB !== this.prevMorphTypeB ||
      Math.abs(morphAmountB - this.prevMorphAmountB) > 0.007
    ) {
      this.prevMorphTypeB = morphTypeB;
      this.prevMorphAmountB = morphAmountB;
      const morphed = this.spectralMorphB.getMorphed(morphTypeB as SpectralMorphType, morphAmountB);
      if (morphed) this.voiceManager.setWavetableB(morphed);
    }

    // Osc C
    this.voiceParams.oscCOn = getParam(this.sab, SabParam.OscCOn) > 0.5;
    this.voiceParams.oscCLevel = getParam(this.sab, SabParam.OscCLevel);
    this.voiceParams.oscCFramePosition = getParam(this.sab, SabParam.OscCFramePosition);
    this.voiceParams.oscCDetune = getParam(this.sab, SabParam.OscCDetune);
    this.voiceParams.oscCOctave = Math.round(getParam(this.sab, SabParam.OscCOctave));
    this.voiceParams.oscCSemitone = Math.round(getParam(this.sab, SabParam.OscCSemitone));
    this.voiceParams.oscCPhaseOffset = getParam(this.sab, SabParam.OscCPhaseOffset);
    this.voiceParams.oscCRandomPhase = getParam(this.sab, SabParam.OscCRandomPhase);
    this.voiceParams.oscCUnisonVoices = getParam(this.sab, SabParam.OscCUnisonVoices);
    this.voiceParams.oscCUnisonDetune = getParam(this.sab, SabParam.OscCUnisonDetune);
    this.voiceParams.oscCUnisonSpread = getParam(this.sab, SabParam.OscCUnisonSpread);
    this.voiceParams.oscCWarpType = getParam(this.sab, SabParam.OscCWarpType) as WarpType;
    this.voiceParams.oscCWarpAmount = getParam(this.sab, SabParam.OscCWarpAmount);
    this.voiceParams.oscCWarp2Type = getParam(this.sab, SabParam.OscCWarp2Type) as WarpType;
    this.voiceParams.oscCWarp2Amount = getParam(this.sab, SabParam.OscCWarp2Amount);

    const newWtTypeC = Math.round(getParam(this.sab, SabParam.OscCWavetableIndex));
    if (newWtTypeC !== this.wtTypeC) {
      this.wtTypeC = newWtTypeC;
      if (newWtTypeC >= 0 && newWtTypeC < PRESET_COUNT) {
        this.setWavetableC(generateWavetableByIndex(newWtTypeC, 2048));
      }
    }

    const morphTypeC = Math.round(getParam(this.sab, SabParam.OscCSpectralMorphType));
    const morphAmountC = getParam(this.sab, SabParam.OscCSpectralMorphAmount);
    if (
      morphTypeC !== this.prevMorphTypeC ||
      Math.abs(morphAmountC - this.prevMorphAmountC) > 0.007
    ) {
      this.prevMorphTypeC = morphTypeC;
      this.prevMorphAmountC = morphAmountC;
      const morphed = this.spectralMorphC.getMorphed(morphTypeC as SpectralMorphType, morphAmountC);
      if (morphed) this.voiceManager.setWavetableC(morphed);
    }

    // Sub + Noise
    this.voiceParams.subOn = getParam(this.sab, SabParam.SubOn) > 0.5;
    this.voiceParams.subOctave = getParam(this.sab, SabParam.SubOctave);
    this.voiceParams.subLevel = getParam(this.sab, SabParam.SubLevel);
    this.voiceParams.noiseType = getParam(this.sab, SabParam.NoiseType) as NoiseType;
    this.voiceParams.noiseLevel = getParam(this.sab, SabParam.NoiseLevel);

    // Filter
    this.voiceParams.filterCutoff = getParam(this.sab, SabParam.FilterCutoff);
    this.voiceParams.filterResonance = getParam(this.sab, SabParam.FilterResonance);
    this.voiceParams.filterDrive = getParam(this.sab, SabParam.FilterDrive);
    this.voiceParams.filterType = Math.round(getParam(this.sab, SabParam.FilterType));
    this.voiceParams.filterEnvAmount = getParam(this.sab, SabParam.FilterEnvAmount);
    this.voiceParams.filterOn = getParam(this.sab, SabParam.FilterOn) >= 0.5;

    // Filter 2
    this.voiceParams.filter2Cutoff = getParam(this.sab, SabParam.Filter2Cutoff);
    this.voiceParams.filter2Resonance = getParam(this.sab, SabParam.Filter2Resonance);
    this.voiceParams.filter2Drive = getParam(this.sab, SabParam.Filter2Drive);
    this.voiceParams.filter2Type = Math.round(getParam(this.sab, SabParam.Filter2Type));
    this.voiceParams.filter2EnvAmount = getParam(this.sab, SabParam.Filter2EnvAmount);
    this.voiceParams.filter2On = getParam(this.sab, SabParam.Filter2On) >= 0.5;

    // Envelopes
    this.voiceParams.ampAttack = getParam(this.sab, SabParam.AmpEnvAttack);
    this.voiceParams.ampDecay = getParam(this.sab, SabParam.AmpEnvDecay);
    this.voiceParams.ampSustain = getParam(this.sab, SabParam.AmpEnvSustain);
    this.voiceParams.ampRelease = getParam(this.sab, SabParam.AmpEnvRelease);
    this.voiceParams.filterEnvAttack = getParam(this.sab, SabParam.FilterEnvAttack);
    this.voiceParams.filterEnvDecay = getParam(this.sab, SabParam.FilterEnvDecay);
    this.voiceParams.filterEnvSustain = getParam(this.sab, SabParam.FilterEnvSustain);
    this.voiceParams.filterEnvRelease = getParam(this.sab, SabParam.FilterEnvRelease);

    // LFOs
    this.lfo1.setParams(
      getParam(this.sab, SabParam.Lfo1Rate),
      getParam(this.sab, SabParam.Lfo1Shape) as LfoShape,
    );
    this.lfo2.setParams(
      getParam(this.sab, SabParam.Lfo2Rate),
      getParam(this.sab, SabParam.Lfo2Shape) as LfoShape,
    );

    // Effects
    this.effectsParams.distortionDrive = getParam(this.sab, SabParam.DistortionDrive);
    this.effectsParams.distortionTone = getParam(this.sab, SabParam.DistortionTone);
    this.effectsParams.distortionMix = getParam(this.sab, SabParam.DistortionMix);
    this.effectsParams.distortionMode = getParam(this.sab, SabParam.DistortionMode);
    this.effectsParams.compThreshold = getParam(this.sab, SabParam.CompThreshold);
    this.effectsParams.compRatio = getParam(this.sab, SabParam.CompRatio);
    this.effectsParams.compAttack = getParam(this.sab, SabParam.CompAttack);
    this.effectsParams.compRelease = getParam(this.sab, SabParam.CompRelease);
    this.effectsParams.compMakeup = getParam(this.sab, SabParam.CompMakeup);
    this.effectsParams.compMix = getParam(this.sab, SabParam.CompMix);
    this.effectsParams.chorusRate = getParam(this.sab, SabParam.ChorusRate);
    this.effectsParams.chorusDepth = getParam(this.sab, SabParam.ChorusDepth);
    this.effectsParams.chorusMix = getParam(this.sab, SabParam.ChorusMix);
    this.effectsParams.flangerRate = getParam(this.sab, SabParam.FlangerRate);
    this.effectsParams.flangerDepth = getParam(this.sab, SabParam.FlangerDepth);
    this.effectsParams.flangerFeedback = getParam(this.sab, SabParam.FlangerFeedback);
    this.effectsParams.flangerMix = getParam(this.sab, SabParam.FlangerMix);
    this.effectsParams.phaserRate = getParam(this.sab, SabParam.PhaserRate);
    this.effectsParams.phaserDepth = getParam(this.sab, SabParam.PhaserDepth);
    this.effectsParams.phaserFeedback = getParam(this.sab, SabParam.PhaserFeedback);
    this.effectsParams.phaserMix = getParam(this.sab, SabParam.PhaserMix);
    this.effectsParams.delayTime = getParam(this.sab, SabParam.DelayTime);
    this.effectsParams.delayFeedback = getParam(this.sab, SabParam.DelayFeedback);
    this.effectsParams.delayMix = getParam(this.sab, SabParam.DelayMix);
    this.effectsParams.reverbDecay = getParam(this.sab, SabParam.ReverbDecay);
    this.effectsParams.reverbMix = getParam(this.sab, SabParam.ReverbMix);
    this.effectsParams.eqLowGain = getParam(this.sab, SabParam.EqLowGain);
    this.effectsParams.eqMidGain = getParam(this.sab, SabParam.EqMidGain);
    this.effectsParams.eqHighGain = getParam(this.sab, SabParam.EqHighGain);
    this.effectsParams.eqMix = getParam(this.sab, SabParam.EqMix);

    // Misc
    this.voiceParams.driftAmount = getParam(this.sab, SabParam.DriftAmount);
    this.macros[0] = getParam(this.sab, SabParam.Macro1);
    this.macros[1] = getParam(this.sab, SabParam.Macro2);
    this.macros[2] = getParam(this.sab, SabParam.Macro3);
    this.macros[3] = getParam(this.sab, SabParam.Macro4);
  }
}
