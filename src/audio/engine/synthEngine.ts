import { EffectsChain, type EffectsParams } from "../dsp/effects/effectsChain";
import { FilterType } from "../dsp/filter/svf";
import { LFO } from "../dsp/lfo/lfo";
import type { ModRoute } from "../dsp/modulation/modMatrix";
import { NoiseType } from "../dsp/utils/noise";
import { ParamSmoother } from "../dsp/utils/smoothing";
import { WarpType } from "../dsp/warp/warpTypes";
import { generateSineTable } from "../dsp/wavetable/wavetableEngine";
import type { Wavetable } from "../dsp/wavetable/wavetableEngine";
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
  private wavetableA: Wavetable;
  private wavetableB: Wavetable;
  private lfo1: LFO;
  private lfo2: LFO;
  private macros = [0, 0, 0, 0];

  private voiceParams: VoiceParams = {
    oscAOn: true,
    oscALevel: 0.8,
    oscAFramePosition: 0,
    oscADetune: 0,
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
    oscBUnisonVoices: 1,
    oscBUnisonDetune: 20,
    oscBUnisonSpread: 0.5,
    oscBWarpType: WarpType.NONE,
    oscBWarpAmount: 0,
    oscBWarp2Type: WarpType.NONE,
    oscBWarp2Amount: 0,

    subOn: false,
    subOctave: -1,
    subShape: 0,
    subLevel: 0.5,

    noiseType: NoiseType.WHITE,
    noiseLevel: 0,

    filterCutoff: 8000,
    filterResonance: 0,
    filterDrive: 1,
    filterType: FilterType.LOWPASS,
    filterEnvAmount: 0,

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
    chorusRate: 0.5,
    chorusDepth: 0.3,
    chorusMix: 0,
    delayTime: 0.375,
    delayFeedback: 0.3,
    delayMix: 0,
    reverbDecay: 0.7,
    reverbMix: 0,
  };

  constructor(sampleRate: number) {
    this.sampleRate = sampleRate;
    this.voiceManager = new VoiceManager(sampleRate);
    this.effectsChain = new EffectsChain(sampleRate);
    this.masterVolume = new ParamSmoother(0.8);
    this.wavetableA = generateSineTable(2048);
    this.wavetableB = generateSineTable(2048);
    this.lfo1 = new LFO(sampleRate, BLOCK_SIZE);
    this.lfo2 = new LFO(sampleRate, BLOCK_SIZE);

    this.voiceManager.setWavetableA(this.wavetableA);
    this.voiceManager.setWavetableB(this.wavetableB);
  }

  setSAB(sab: Int32Array): void {
    this.sab = sab;
  }

  setWavetableA(wt: Wavetable): void {
    this.wavetableA = wt;
    this.voiceManager.setWavetableA(wt);
  }

  setWavetableB(wt: Wavetable): void {
    this.wavetableB = wt;
    this.voiceManager.setWavetableB(wt);
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

    // Control-rate processing (once per block)
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

    this.voiceParams.oscAOn = getParam(this.sab, SabParam.OscAOn) > 0.5;
    this.voiceParams.oscALevel = getParam(this.sab, SabParam.OscALevel);
    this.voiceParams.oscAFramePosition = getParam(this.sab, SabParam.OscAFramePosition);
    this.voiceParams.oscADetune = getParam(this.sab, SabParam.OscADetune);
    this.voiceParams.oscAUnisonVoices = getParam(this.sab, SabParam.OscAUnisonVoices);
    this.voiceParams.oscAUnisonDetune = getParam(this.sab, SabParam.OscAUnisonDetune);
    this.voiceParams.oscAUnisonSpread = getParam(this.sab, SabParam.OscAUnisonSpread);
    this.voiceParams.oscAWarpType = getParam(this.sab, SabParam.OscAWarpType) as WarpType;
    this.voiceParams.oscAWarpAmount = getParam(this.sab, SabParam.OscAWarpAmount);

    this.voiceParams.filterCutoff = getParam(this.sab, SabParam.FilterCutoff);
    this.voiceParams.filterResonance = getParam(this.sab, SabParam.FilterResonance);
    this.voiceParams.filterDrive = getParam(this.sab, SabParam.FilterDrive);
    this.voiceParams.filterType = getParam(this.sab, SabParam.FilterType) as FilterType;
    this.voiceParams.filterEnvAmount = getParam(this.sab, SabParam.FilterEnvAmount);

    this.voiceParams.ampAttack = getParam(this.sab, SabParam.AmpEnvAttack);
    this.voiceParams.ampDecay = getParam(this.sab, SabParam.AmpEnvDecay);
    this.voiceParams.ampSustain = getParam(this.sab, SabParam.AmpEnvSustain);
    this.voiceParams.ampRelease = getParam(this.sab, SabParam.AmpEnvRelease);
  }
}
