import { EffectsChain, type EffectsParams } from "../dsp/effects/effectsChain";
import { FilterType } from "../dsp/filter/svf";
import { LFO, type LfoShape } from "../dsp/lfo/lfo";
import type { ModRoute } from "../dsp/modulation/modMatrix";
import { NoiseType } from "../dsp/utils/noise";
import { ParamSmoother } from "../dsp/utils/smoothing";
import { WarpType } from "../dsp/warp/warpTypes";
import { type WavetableType, generateTable } from "../dsp/wavetable/wavetableEngine";
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
  private wtTypeA: WavetableType = 0;
  private wtTypeB: WavetableType = 0;
  private customWtA = false;
  private customWtB = false;
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
    this.wavetableA = generateTable(0, 2048);
    this.wavetableB = generateTable(0, 2048);
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
    this.customWtA = true;
    this.voiceManager.setWavetableA(wt);
  }

  setWavetableB(wt: Wavetable): void {
    this.wavetableB = wt;
    this.customWtB = true;
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

    // Osc A
    this.voiceParams.oscAOn = getParam(this.sab, SabParam.OscAOn) > 0.5;
    this.voiceParams.oscALevel = getParam(this.sab, SabParam.OscALevel);
    this.voiceParams.oscAFramePosition = getParam(this.sab, SabParam.OscAFramePosition);
    this.voiceParams.oscADetune = getParam(this.sab, SabParam.OscADetune);
    this.voiceParams.oscAUnisonVoices = getParam(this.sab, SabParam.OscAUnisonVoices);
    this.voiceParams.oscAUnisonDetune = getParam(this.sab, SabParam.OscAUnisonDetune);
    this.voiceParams.oscAUnisonSpread = getParam(this.sab, SabParam.OscAUnisonSpread);
    this.voiceParams.oscAWarpType = getParam(this.sab, SabParam.OscAWarpType) as WarpType;
    this.voiceParams.oscAWarpAmount = getParam(this.sab, SabParam.OscAWarpAmount);
    this.voiceParams.oscAWarp2Type = getParam(this.sab, SabParam.OscAWarp2Type) as WarpType;
    this.voiceParams.oscAWarp2Amount = getParam(this.sab, SabParam.OscAWarp2Amount);

    // Regenerate wavetable A if type changed (and not custom)
    const newWtTypeA = Math.round(getParam(this.sab, SabParam.OscAWavetableIndex)) as WavetableType;
    if (newWtTypeA !== this.wtTypeA) {
      this.wtTypeA = newWtTypeA;
      this.customWtA = false;
      this.wavetableA = generateTable(newWtTypeA, 2048);
      this.voiceManager.setWavetableA(this.wavetableA);
    }

    // Osc B
    this.voiceParams.oscBOn = getParam(this.sab, SabParam.OscBOn) > 0.5;
    this.voiceParams.oscBLevel = getParam(this.sab, SabParam.OscBLevel);
    this.voiceParams.oscBFramePosition = getParam(this.sab, SabParam.OscBFramePosition);
    this.voiceParams.oscBDetune = getParam(this.sab, SabParam.OscBDetune);
    this.voiceParams.oscBUnisonVoices = getParam(this.sab, SabParam.OscBUnisonVoices);
    this.voiceParams.oscBUnisonDetune = getParam(this.sab, SabParam.OscBUnisonDetune);
    this.voiceParams.oscBUnisonSpread = getParam(this.sab, SabParam.OscBUnisonSpread);
    this.voiceParams.oscBWarpType = getParam(this.sab, SabParam.OscBWarpType) as WarpType;
    this.voiceParams.oscBWarpAmount = getParam(this.sab, SabParam.OscBWarpAmount);
    this.voiceParams.oscBWarp2Type = getParam(this.sab, SabParam.OscBWarp2Type) as WarpType;
    this.voiceParams.oscBWarp2Amount = getParam(this.sab, SabParam.OscBWarp2Amount);

    // Regenerate wavetable B if type changed (and not custom)
    const newWtTypeB = Math.round(getParam(this.sab, SabParam.OscBWavetableIndex)) as WavetableType;
    if (newWtTypeB !== this.wtTypeB) {
      this.wtTypeB = newWtTypeB;
      this.customWtB = false;
      this.wavetableB = generateTable(newWtTypeB, 2048);
      this.voiceManager.setWavetableB(this.wavetableB);
    }

    // Sub + Noise
    this.voiceParams.subOn = getParam(this.sab, SabParam.SubOn) > 0.5;
    this.voiceParams.subOctave = getParam(this.sab, SabParam.SubOctave);
    this.voiceParams.subShape = getParam(this.sab, SabParam.SubShape);
    this.voiceParams.subLevel = getParam(this.sab, SabParam.SubLevel);
    this.voiceParams.noiseType = getParam(this.sab, SabParam.NoiseType) as NoiseType;
    this.voiceParams.noiseLevel = getParam(this.sab, SabParam.NoiseLevel);

    // Filter
    this.voiceParams.filterCutoff = getParam(this.sab, SabParam.FilterCutoff);
    this.voiceParams.filterResonance = getParam(this.sab, SabParam.FilterResonance);
    this.voiceParams.filterDrive = getParam(this.sab, SabParam.FilterDrive);
    this.voiceParams.filterType = getParam(this.sab, SabParam.FilterType) as FilterType;
    this.voiceParams.filterEnvAmount = getParam(this.sab, SabParam.FilterEnvAmount);

    // Amp Envelope
    this.voiceParams.ampAttack = getParam(this.sab, SabParam.AmpEnvAttack);
    this.voiceParams.ampDecay = getParam(this.sab, SabParam.AmpEnvDecay);
    this.voiceParams.ampSustain = getParam(this.sab, SabParam.AmpEnvSustain);
    this.voiceParams.ampRelease = getParam(this.sab, SabParam.AmpEnvRelease);

    // Filter Envelope
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
    this.effectsParams.chorusRate = getParam(this.sab, SabParam.ChorusRate);
    this.effectsParams.chorusDepth = getParam(this.sab, SabParam.ChorusDepth);
    this.effectsParams.chorusMix = getParam(this.sab, SabParam.ChorusMix);
    this.effectsParams.delayTime = getParam(this.sab, SabParam.DelayTime);
    this.effectsParams.delayFeedback = getParam(this.sab, SabParam.DelayFeedback);
    this.effectsParams.delayMix = getParam(this.sab, SabParam.DelayMix);
    this.effectsParams.reverbDecay = getParam(this.sab, SabParam.ReverbDecay);
    this.effectsParams.reverbMix = getParam(this.sab, SabParam.ReverbMix);

    // Misc
    this.voiceParams.driftAmount = getParam(this.sab, SabParam.DriftAmount);
    this.macros[0] = getParam(this.sab, SabParam.Macro1);
    this.macros[1] = getParam(this.sab, SabParam.Macro2);
    this.macros[2] = getParam(this.sab, SabParam.Macro3);
    this.macros[3] = getParam(this.sab, SabParam.Macro4);
  }
}
