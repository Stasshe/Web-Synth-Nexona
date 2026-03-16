import { EffectsChain, type EffectsParams } from "../dsp/effects/effectsChain";
import { LFO, type LfoShape } from "../dsp/lfo/lfo";
import { type ModRoute, ModSource, ModTarget, ModulationMatrix } from "../dsp/modulation/modMatrix";
import { SmoothRandom } from "../dsp/modulation/smoothRandom";
import { SpectralMorphProcessor } from "../dsp/spectralMorph/spectralMorphProcessor";
import type { SpectralMorphType } from "../dsp/spectralMorph/spectralMorphTypes";
import { NoiseType } from "../dsp/utils/noise";
import { ParamSmoother } from "../dsp/utils/smoothing";
import { DistortionType } from "../dsp/warp/warpTypes";
import { PRESET_COUNT, type Wavetable, generatePreset } from "../dsp/wavetable/wavetablePresets";
import { SabParam, getParam } from "../sab/layout";
import type { VoiceParams } from "./voice";
import { VoiceManager } from "./voiceManager";

const BLOCK_SIZE = 128;

export interface ModFeedback {
  lfo1Phase: number;
  lfo2Phase: number;
  lfo1Value: number;
  lfo2Value: number;
  randomValue: number;
  envAmpLevel: number;
  envAmpState: number;
  envFilterLevel: number;
  envFilterState: number;
  compGainReduction: number;
}

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
  private smoothRandom: SmoothRandom;
  private macros = [0, 0, 0, 0];
  private engineModMatrix = new ModulationMatrix();

  private voiceParams: VoiceParams = {
    oscAOn: true,
    oscALevel: Math.SQRT1_2,
    oscAFramePosition: 0,
    oscATune: 0,
    oscATranspose: 0,
    oscAPhaseOffset: 0,
    oscARandomPhase: 1,
    oscAUnisonVoices: 1,
    oscAUnisonDetune: 0.2,
    oscAUnisonBlend: 0.8,
    oscAUnisonSpread: 1.0,
    oscAUnisonStackType: 0,
    oscAUnisonDetunePower: 1.5,
    oscAUnisonDetuneRange: 2,
    oscAUnisonFrameSpread: 0,
    oscADistortionType: DistortionType.NONE,
    oscADistortionAmount: 0.5,
    oscADistortionPhase: 0.5,
    oscAPan: 0,
    oscADestination: 0,

    oscBOn: false,
    oscBLevel: Math.SQRT1_2,
    oscBFramePosition: 0,
    oscBTune: 0,
    oscBTranspose: 0,
    oscBPhaseOffset: 0,
    oscBRandomPhase: 1,
    oscBUnisonVoices: 1,
    oscBUnisonDetune: 0.2,
    oscBUnisonBlend: 0.8,
    oscBUnisonSpread: 1.0,
    oscBUnisonStackType: 0,
    oscBUnisonDetunePower: 1.5,
    oscBUnisonDetuneRange: 2,
    oscBUnisonFrameSpread: 0,
    oscBDistortionType: DistortionType.NONE,
    oscBDistortionAmount: 0.5,
    oscBDistortionPhase: 0.5,
    oscBPan: 0,
    oscBDestination: 0,

    oscCOn: false,
    oscCLevel: Math.SQRT1_2,
    oscCFramePosition: 0,
    oscCTune: 0,
    oscCTranspose: 0,
    oscCPhaseOffset: 0,
    oscCRandomPhase: 1,
    oscCUnisonVoices: 1,
    oscCUnisonDetune: 0.2,
    oscCUnisonBlend: 0.8,
    oscCUnisonSpread: 1.0,
    oscCUnisonStackType: 0,
    oscCUnisonDetunePower: 1.5,
    oscCUnisonDetuneRange: 2,
    oscCUnisonFrameSpread: 0,
    oscCDistortionType: DistortionType.NONE,
    oscCDistortionAmount: 0.5,
    oscCDistortionPhase: 0.5,
    oscCPan: 0,
    oscCDestination: 0,

    subOn: false,
    subOctave: -1,
    subLevel: 0.5,

    noiseType: NoiseType.WHITE,
    noiseLevel: 0,

    filterCutoff: 8000,
    filterResonance: 0,
    filterDrive: 1,
    filterType: 0,
    filterBlend: -1,
    filterStyle: 0,
    filterEnvAmount: 0,
    filterOn: true,
    filter1Input: 0b1111, // all sources

    filter2Cutoff: 20000,
    filter2Resonance: 0,
    filter2Drive: 1,
    filter2Type: 0,
    filter2Blend: -1,
    filter2Style: 0,
    filter2EnvAmount: 0,
    filter2On: true,
    filter2Input: 0b10000, // filter1 only

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
    compKnee: 6,

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
    this.sourceWtA = generatePreset(0, 2048);
    this.sourceWtB = generatePreset(0, 2048);
    this.sourceWtC = generatePreset(0, 2048);
    const subFullTable = generatePreset(0, 2048);
    this.wavetableSub = { frames: [subFullTable.frames[0]], tableSize: 2048, numFrames: 1 };
    this.lfo1 = new LFO(sampleRate, BLOCK_SIZE);
    this.lfo2 = new LFO(sampleRate, BLOCK_SIZE);
    this.smoothRandom = new SmoothRandom(sampleRate, BLOCK_SIZE, 2);

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

  setLfo1CustomShape(table: Float32Array): void {
    this.lfo1.setCustomTable(table);
  }

  setLfo2CustomShape(table: Float32Array): void {
    this.lfo2.setCustomTable(table);
  }

  setModRoutes(routes: ModRoute[]): void {
    this.voiceManager.setModRoutes(routes);
    this.engineModMatrix.setRoutes(routes);
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
    const randomVal = this.smoothRandom.process();
    this.voiceManager.setLfoValues(lfo1Val, lfo2Val, this.macros, randomVal);
    this.voiceManager.setParams(this.voiceParams);

    // Set engine-level mod source values for effects modulation
    this.engineModMatrix.setSourceValue(ModSource.LFO1, lfo1Val);
    this.engineModMatrix.setSourceValue(ModSource.LFO2, lfo2Val);
    this.engineModMatrix.setSourceValue(ModSource.RANDOM, randomVal);
    for (let i = 0; i < 4; i++) {
      this.engineModMatrix.setSourceValue(ModSource.MACRO1 + i, this.macros[i]);
    }
    const envState = this.voiceManager.getActiveEnvelopeState();
    this.engineModMatrix.setSourceValue(ModSource.AMP_ENV, envState.ampLevel);
    this.engineModMatrix.setSourceValue(ModSource.FILTER_ENV, envState.filterLevel);

    // Apply modulation to effects params
    this.applyEffectsModulation();
    this.effectsChain.setParams(this.effectsParams);

    for (let i = 0; i < blockSize; i++) {
      let [l, r] = this.voiceManager.processSample();
      [l, r] = this.effectsChain.process(l, r);
      const master = this.masterVolume.tick();
      left[i] = l * master;
      right[i] = r * master;
    }
  }

  getCompGR(): number {
    return this.effectsChain.getCompGR();
  }

  getModFeedback(): ModFeedback {
    const voiceEnv = this.voiceManager.getActiveEnvelopeState();
    return {
      lfo1Phase: this.lfo1.getPhase(),
      lfo2Phase: this.lfo2.getPhase(),
      lfo1Value: this.lfo1.getValue(),
      lfo2Value: this.lfo2.getValue(),
      randomValue: this.smoothRandom.getValue(),
      envAmpLevel: voiceEnv.ampLevel,
      envAmpState: voiceEnv.ampState,
      envFilterLevel: voiceEnv.filterLevel,
      envFilterState: voiceEnv.filterState,
      compGainReduction: this.effectsChain.getCompGR(),
    };
  }

  private applyEffectsModulation(): void {
    const mm = this.engineModMatrix;

    this.effectsParams.distortionDrive = Math.max(
      1,
      this.effectsParams.distortionDrive + mm.getModulation(ModTarget.DIST_DRIVE) * 19,
    );
    this.effectsParams.distortionMix = Math.max(
      0,
      Math.min(1, this.effectsParams.distortionMix + mm.getModulation(ModTarget.DIST_MIX)),
    );
    this.effectsParams.chorusRate = Math.max(
      0.1,
      this.effectsParams.chorusRate + mm.getModulation(ModTarget.CHORUS_RATE) * 5,
    );
    this.effectsParams.chorusDepth = Math.max(
      0,
      Math.min(1, this.effectsParams.chorusDepth + mm.getModulation(ModTarget.CHORUS_DEPTH)),
    );
    this.effectsParams.chorusMix = Math.max(
      0,
      Math.min(1, this.effectsParams.chorusMix + mm.getModulation(ModTarget.CHORUS_MIX)),
    );
    this.effectsParams.flangerRate = Math.max(
      0.01,
      this.effectsParams.flangerRate + mm.getModulation(ModTarget.FLANGER_RATE) * 10,
    );
    this.effectsParams.flangerDepth = Math.max(
      0,
      Math.min(1, this.effectsParams.flangerDepth + mm.getModulation(ModTarget.FLANGER_DEPTH)),
    );
    this.effectsParams.flangerFeedback = Math.max(
      0,
      Math.min(
        0.95,
        this.effectsParams.flangerFeedback + mm.getModulation(ModTarget.FLANGER_FEEDBACK) * 0.95,
      ),
    );
    this.effectsParams.flangerMix = Math.max(
      0,
      Math.min(1, this.effectsParams.flangerMix + mm.getModulation(ModTarget.FLANGER_MIX)),
    );
    this.effectsParams.phaserRate = Math.max(
      0.01,
      this.effectsParams.phaserRate + mm.getModulation(ModTarget.PHASER_RATE) * 10,
    );
    this.effectsParams.phaserDepth = Math.max(
      0,
      Math.min(1, this.effectsParams.phaserDepth + mm.getModulation(ModTarget.PHASER_DEPTH)),
    );
    this.effectsParams.phaserFeedback = Math.max(
      0,
      Math.min(
        0.95,
        this.effectsParams.phaserFeedback + mm.getModulation(ModTarget.PHASER_FEEDBACK) * 0.95,
      ),
    );
    this.effectsParams.phaserMix = Math.max(
      0,
      Math.min(1, this.effectsParams.phaserMix + mm.getModulation(ModTarget.PHASER_MIX)),
    );
    this.effectsParams.delayTime = Math.max(
      0.01,
      Math.min(2, this.effectsParams.delayTime + mm.getModulation(ModTarget.DELAY_TIME) * 2),
    );
    this.effectsParams.delayFeedback = Math.max(
      0,
      Math.min(
        0.95,
        this.effectsParams.delayFeedback + mm.getModulation(ModTarget.DELAY_FEEDBACK) * 0.95,
      ),
    );
    this.effectsParams.delayMix = Math.max(
      0,
      Math.min(1, this.effectsParams.delayMix + mm.getModulation(ModTarget.DELAY_MIX)),
    );
    this.effectsParams.reverbDecay = Math.max(
      0.1,
      Math.min(
        0.99,
        this.effectsParams.reverbDecay + mm.getModulation(ModTarget.REVERB_DECAY) * 0.99,
      ),
    );
    this.effectsParams.reverbMix = Math.max(
      0,
      Math.min(1, this.effectsParams.reverbMix + mm.getModulation(ModTarget.REVERB_MIX)),
    );
    this.effectsParams.eqLowGain = Math.max(
      -12,
      Math.min(12, this.effectsParams.eqLowGain + mm.getModulation(ModTarget.EQ_LOW) * 12),
    );
    this.effectsParams.eqMidGain = Math.max(
      -12,
      Math.min(12, this.effectsParams.eqMidGain + mm.getModulation(ModTarget.EQ_MID) * 12),
    );
    this.effectsParams.eqHighGain = Math.max(
      -12,
      Math.min(12, this.effectsParams.eqHighGain + mm.getModulation(ModTarget.EQ_HIGH) * 12),
    );
  }

  private readParams(): void {
    if (!this.sab) return;

    this.masterVolume.setTarget(getParam(this.sab, SabParam.MasterVolume));

    // Osc A
    this.voiceParams.oscAOn = getParam(this.sab, SabParam.OscAOn) > 0.5;
    this.voiceParams.oscALevel = getParam(this.sab, SabParam.OscALevel);
    this.voiceParams.oscAFramePosition = getParam(this.sab, SabParam.OscAFramePosition);
    this.voiceParams.oscATune = getParam(this.sab, SabParam.OscATune);
    this.voiceParams.oscATranspose = Math.round(getParam(this.sab, SabParam.OscATranspose));
    this.voiceParams.oscAPhaseOffset = getParam(this.sab, SabParam.OscAPhaseOffset);
    this.voiceParams.oscARandomPhase = getParam(this.sab, SabParam.OscARandomPhase);
    this.voiceParams.oscAUnisonVoices = getParam(this.sab, SabParam.OscAUnisonVoices);
    this.voiceParams.oscAUnisonDetune = getParam(this.sab, SabParam.OscAUnisonDetune);
    this.voiceParams.oscAUnisonBlend = getParam(this.sab, SabParam.OscAUnisonBlend);
    this.voiceParams.oscAUnisonSpread = getParam(this.sab, SabParam.OscAUnisonSpread);
    this.voiceParams.oscAUnisonStackType = Math.round(
      getParam(this.sab, SabParam.OscAUnisonStackType),
    );
    this.voiceParams.oscAUnisonDetunePower = getParam(this.sab, SabParam.OscAUnisonDetunePower);
    this.voiceParams.oscAUnisonDetuneRange = getParam(this.sab, SabParam.OscADetuneRange);
    this.voiceParams.oscAUnisonFrameSpread = getParam(this.sab, SabParam.OscAFrameSpread);
    this.voiceParams.oscADistortionType = Math.round(
      getParam(this.sab, SabParam.OscADistortionType),
    ) as DistortionType;
    this.voiceParams.oscADistortionAmount = getParam(this.sab, SabParam.OscADistortionAmount);
    this.voiceParams.oscADistortionPhase = getParam(this.sab, SabParam.OscADistortionPhase);
    this.voiceParams.oscAPan = getParam(this.sab, SabParam.OscAPan);
    this.voiceParams.oscADestination = Math.round(getParam(this.sab, SabParam.OscADestination));

    const newWtTypeA = Math.round(getParam(this.sab, SabParam.OscAWavetableIndex));
    if (newWtTypeA !== this.wtTypeA) {
      this.wtTypeA = newWtTypeA;
      if (newWtTypeA >= 0 && newWtTypeA < PRESET_COUNT) {
        this.setWavetableA(generatePreset(newWtTypeA, 2048));
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
    this.voiceParams.oscBTune = getParam(this.sab, SabParam.OscBTune);
    this.voiceParams.oscBTranspose = Math.round(getParam(this.sab, SabParam.OscBTranspose));
    this.voiceParams.oscBPhaseOffset = getParam(this.sab, SabParam.OscBPhaseOffset);
    this.voiceParams.oscBRandomPhase = getParam(this.sab, SabParam.OscBRandomPhase);
    this.voiceParams.oscBUnisonVoices = getParam(this.sab, SabParam.OscBUnisonVoices);
    this.voiceParams.oscBUnisonDetune = getParam(this.sab, SabParam.OscBUnisonDetune);
    this.voiceParams.oscBUnisonBlend = getParam(this.sab, SabParam.OscBUnisonBlend);
    this.voiceParams.oscBUnisonSpread = getParam(this.sab, SabParam.OscBUnisonSpread);
    this.voiceParams.oscBUnisonStackType = Math.round(
      getParam(this.sab, SabParam.OscBUnisonStackType),
    );
    this.voiceParams.oscBUnisonDetunePower = getParam(this.sab, SabParam.OscBUnisonDetunePower);
    this.voiceParams.oscBUnisonDetuneRange = getParam(this.sab, SabParam.OscBDetuneRange);
    this.voiceParams.oscBUnisonFrameSpread = getParam(this.sab, SabParam.OscBFrameSpread);
    this.voiceParams.oscBDistortionType = Math.round(
      getParam(this.sab, SabParam.OscBDistortionType),
    ) as DistortionType;
    this.voiceParams.oscBDistortionAmount = getParam(this.sab, SabParam.OscBDistortionAmount);
    this.voiceParams.oscBDistortionPhase = getParam(this.sab, SabParam.OscBDistortionPhase);
    this.voiceParams.oscBPan = getParam(this.sab, SabParam.OscBPan);
    this.voiceParams.oscBDestination = Math.round(getParam(this.sab, SabParam.OscBDestination));

    const newWtTypeB = Math.round(getParam(this.sab, SabParam.OscBWavetableIndex));
    if (newWtTypeB !== this.wtTypeB) {
      this.wtTypeB = newWtTypeB;
      if (newWtTypeB >= 0 && newWtTypeB < PRESET_COUNT) {
        this.setWavetableB(generatePreset(newWtTypeB, 2048));
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
    this.voiceParams.oscCTune = getParam(this.sab, SabParam.OscCTune);
    this.voiceParams.oscCTranspose = Math.round(getParam(this.sab, SabParam.OscCTranspose));
    this.voiceParams.oscCPhaseOffset = getParam(this.sab, SabParam.OscCPhaseOffset);
    this.voiceParams.oscCRandomPhase = getParam(this.sab, SabParam.OscCRandomPhase);
    this.voiceParams.oscCUnisonVoices = getParam(this.sab, SabParam.OscCUnisonVoices);
    this.voiceParams.oscCUnisonDetune = getParam(this.sab, SabParam.OscCUnisonDetune);
    this.voiceParams.oscCUnisonBlend = getParam(this.sab, SabParam.OscCUnisonBlend);
    this.voiceParams.oscCUnisonSpread = getParam(this.sab, SabParam.OscCUnisonSpread);
    this.voiceParams.oscCUnisonStackType = Math.round(
      getParam(this.sab, SabParam.OscCUnisonStackType),
    );
    this.voiceParams.oscCUnisonDetunePower = getParam(this.sab, SabParam.OscCUnisonDetunePower);
    this.voiceParams.oscCUnisonDetuneRange = getParam(this.sab, SabParam.OscCDetuneRange);
    this.voiceParams.oscCUnisonFrameSpread = getParam(this.sab, SabParam.OscCFrameSpread);
    this.voiceParams.oscCDistortionType = Math.round(
      getParam(this.sab, SabParam.OscCDistortionType),
    ) as DistortionType;
    this.voiceParams.oscCDistortionAmount = getParam(this.sab, SabParam.OscCDistortionAmount);
    this.voiceParams.oscCDistortionPhase = getParam(this.sab, SabParam.OscCDistortionPhase);
    this.voiceParams.oscCPan = getParam(this.sab, SabParam.OscCPan);
    this.voiceParams.oscCDestination = Math.round(getParam(this.sab, SabParam.OscCDestination));

    const newWtTypeC = Math.round(getParam(this.sab, SabParam.OscCWavetableIndex));
    if (newWtTypeC !== this.wtTypeC) {
      this.wtTypeC = newWtTypeC;
      if (newWtTypeC >= 0 && newWtTypeC < PRESET_COUNT) {
        this.setWavetableC(generatePreset(newWtTypeC, 2048));
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
    this.voiceParams.filterBlend = getParam(this.sab, SabParam.FilterBlend);
    this.voiceParams.filterStyle = Math.round(getParam(this.sab, SabParam.FilterStyle));
    this.voiceParams.filterEnvAmount = getParam(this.sab, SabParam.FilterEnvAmount);
    this.voiceParams.filterOn = getParam(this.sab, SabParam.FilterOn) >= 0.5;
    this.voiceParams.filter1Input = Math.round(getParam(this.sab, SabParam.Filter1Input)) || 0b1111;

    // Filter 2
    this.voiceParams.filter2Cutoff = getParam(this.sab, SabParam.Filter2Cutoff);
    this.voiceParams.filter2Resonance = getParam(this.sab, SabParam.Filter2Resonance);
    this.voiceParams.filter2Drive = getParam(this.sab, SabParam.Filter2Drive);
    this.voiceParams.filter2Type = Math.round(getParam(this.sab, SabParam.Filter2Type));
    this.voiceParams.filter2Blend = getParam(this.sab, SabParam.Filter2Blend);
    this.voiceParams.filter2Style = Math.round(getParam(this.sab, SabParam.Filter2Style));
    this.voiceParams.filter2EnvAmount = getParam(this.sab, SabParam.Filter2EnvAmount);
    this.voiceParams.filter2On = getParam(this.sab, SabParam.Filter2On) >= 0.5;
    this.voiceParams.filter2Input =
      Math.round(getParam(this.sab, SabParam.Filter2Input)) || 0b10000;

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
    this.effectsParams.compKnee = getParam(this.sab, SabParam.CompKnee);
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

    // Effects order
    const order: number[] = [];
    for (let i = 0; i < 8; i++) {
      order.push(Math.round(getParam(this.sab, SabParam.EffectsOrder0 + i)));
    }
    this.effectsChain.setOrder(order);

    // Misc
    this.voiceParams.driftAmount = getParam(this.sab, SabParam.DriftAmount);
    this.macros[0] = getParam(this.sab, SabParam.Macro1);
    this.macros[1] = getParam(this.sab, SabParam.Macro2);
    this.macros[2] = getParam(this.sab, SabParam.Macro3);
    this.macros[3] = getParam(this.sab, SabParam.Macro4);
  }
}
