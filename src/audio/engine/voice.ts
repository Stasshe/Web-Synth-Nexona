import { ADSREnvelope } from "../dsp/envelope/adsr";
import { createFilter } from "../dsp/filter/filterRegistry";
import type { FilterProcessor } from "../dsp/filter/filterTypes";
import { ModSource, ModTarget, ModulationMatrix } from "../dsp/modulation/modMatrix";
import { SubOscillator } from "../dsp/oscillator/subOscillator";
import { UnisonEngine } from "../dsp/oscillator/unisonEngine";
import { AnalogDrift } from "../dsp/utils/drift";
import { clamp, midiToFreq } from "../dsp/utils/math";
import { NoiseGenerator, type NoiseType } from "../dsp/utils/noise";
import { ParamSmoother } from "../dsp/utils/smoothing";
import type { WarpType } from "../dsp/warp/warpTypes";
import type { Wavetable } from "../dsp/wavetable/wavetablePresets";

export interface VoiceParams {
  oscAOn: boolean;
  oscALevel: number;
  oscAFramePosition: number;
  oscADetune: number;
  oscAOctave: number;
  oscASemitone: number;
  oscAPhaseOffset: number;
  oscARandomPhase: number;
  oscAUnisonVoices: number;
  oscAUnisonDetune: number;
  oscAUnisonSpread: number;
  oscAWarpType: WarpType;
  oscAWarpAmount: number;
  oscAWarp2Type: WarpType;
  oscAWarp2Amount: number;
  oscAPan: number;

  oscBOn: boolean;
  oscBLevel: number;
  oscBFramePosition: number;
  oscBDetune: number;
  oscBOctave: number;
  oscBSemitone: number;
  oscBPhaseOffset: number;
  oscBRandomPhase: number;
  oscBUnisonVoices: number;
  oscBUnisonDetune: number;
  oscBUnisonSpread: number;
  oscBWarpType: WarpType;
  oscBWarpAmount: number;
  oscBWarp2Type: WarpType;
  oscBWarp2Amount: number;
  oscBPan: number;

  oscCOn: boolean;
  oscCLevel: number;
  oscCFramePosition: number;
  oscCDetune: number;
  oscCOctave: number;
  oscCSemitone: number;
  oscCPhaseOffset: number;
  oscCRandomPhase: number;
  oscCUnisonVoices: number;
  oscCUnisonDetune: number;
  oscCUnisonSpread: number;
  oscCWarpType: WarpType;
  oscCWarpAmount: number;
  oscCWarp2Type: WarpType;
  oscCWarp2Amount: number;
  oscCPan: number;

  subOn: boolean;
  subOctave: number;
  subLevel: number;

  noiseType: NoiseType;
  noiseLevel: number;

  filterCutoff: number;
  filterResonance: number;
  filterDrive: number;
  filterType: number;
  filterEnvAmount: number;
  filterOn: boolean;

  filter2Cutoff: number;
  filter2Resonance: number;
  filter2Drive: number;
  filter2Type: number;
  filter2EnvAmount: number;
  filter2On: boolean;

  ampAttack: number;
  ampDecay: number;
  ampSustain: number;
  ampRelease: number;

  filterEnvAttack: number;
  filterEnvDecay: number;
  filterEnvSustain: number;
  filterEnvRelease: number;

  driftAmount: number;
}

export class Voice {
  readonly oscA: UnisonEngine;
  readonly oscB: UnisonEngine;
  readonly oscC: UnisonEngine;
  readonly sub: SubOscillator;
  readonly noise: NoiseGenerator;
  readonly ampEnvelope: ADSREnvelope;
  readonly filterEnvelope: ADSREnvelope;
  readonly modMatrix: ModulationMatrix;
  readonly drift: AnalogDrift;

  private filterL: FilterProcessor;
  private filterR: FilterProcessor;
  private filter2L: FilterProcessor;
  private filter2R: FilterProcessor;
  private filterTypeIndex = 0;
  private filter2TypeIndex = 0;

  private levelSmoother: ParamSmoother;
  private cutoffSmoother: ParamSmoother;
  private cutoff2Smoother: ParamSmoother;

  private note = -1;
  private velocity = 0;
  private sampleRate: number;
  private fadeOut = 0;
  private readonly FADE_SAMPLES = 32;
  private _params: VoiceParams | null = null;

  constructor(sampleRate: number) {
    this.sampleRate = sampleRate;
    this.oscA = new UnisonEngine(sampleRate);
    this.oscB = new UnisonEngine(sampleRate);
    this.oscC = new UnisonEngine(sampleRate);
    this.sub = new SubOscillator(sampleRate);
    this.noise = new NoiseGenerator();
    this.filterL = createFilter(0, sampleRate);
    this.filterR = createFilter(0, sampleRate);
    this.filter2L = createFilter(0, sampleRate);
    this.filter2R = createFilter(0, sampleRate);
    this.ampEnvelope = new ADSREnvelope(sampleRate);
    this.filterEnvelope = new ADSREnvelope(sampleRate);
    this.modMatrix = new ModulationMatrix();
    this.drift = new AnalogDrift(sampleRate);
    this.levelSmoother = new ParamSmoother(0.8);
    this.cutoffSmoother = new ParamSmoother(8000);
    this.cutoff2Smoother = new ParamSmoother(20000);

    this.ampEnvelope.setParams(0.01, 0.1, 0.7, 0.3);
    this.filterEnvelope.setParams(0.01, 0.1, 0, 0.3);
  }

  setWavetableA(wt: Wavetable): void {
    this.oscA.setWavetable(wt);
  }
  setWavetableB(wt: Wavetable): void {
    this.oscB.setWavetable(wt);
  }
  setWavetableC(wt: Wavetable): void {
    this.oscC.setWavetable(wt);
  }
  setWavetableSub(wt: Wavetable): void {
    this.sub.setWavetable(wt);
  }

  noteOn(note: number, vel: number): void {
    this.note = note;
    this.velocity = vel / 127;
    this.fadeOut = 0;

    const freq = midiToFreq(note);
    this.oscA.setFrequency(freq);
    this.oscB.setFrequency(freq);
    this.oscC.setFrequency(freq);
    this.sub.setNote(note, -1);

    this.oscA.resetPhases();
    this.oscB.resetPhases();
    this.oscC.resetPhases();
    this.sub.resetPhase();
    this.filterL.reset();
    this.filterR.reset();
    this.filter2L.reset();
    this.filter2R.reset();

    this.ampEnvelope.gate();
    this.filterEnvelope.gate();
  }

  noteOff(): void {
    this.ampEnvelope.release();
    this.filterEnvelope.release();
  }

  startFadeOut(): void {
    this.fadeOut = this.FADE_SAMPLES;
  }
  isIdle(): boolean {
    return this.ampEnvelope.isIdle() && this.fadeOut === 0;
  }
  getNote(): number {
    return this.note;
  }

  setParams(p: VoiceParams): void {
    this.oscA.setUnisonCount(p.oscAUnisonVoices, p.oscAUnisonDetune, p.oscAUnisonSpread);
    this.oscB.setUnisonCount(p.oscBUnisonVoices, p.oscBUnisonDetune, p.oscBUnisonSpread);
    this.oscC.setUnisonCount(p.oscCUnisonVoices, p.oscCUnisonDetune, p.oscCUnisonSpread);

    this.oscA.setPhaseParams(p.oscAPhaseOffset, p.oscARandomPhase);
    this.oscB.setPhaseParams(p.oscBPhaseOffset, p.oscBRandomPhase);
    this.oscC.setPhaseParams(p.oscCPhaseOffset, p.oscCRandomPhase);

    if (this.note >= 0) this.sub.setNote(this.note, p.subOctave);

    // Swap filter instances when type changes
    const ft = Math.round(p.filterType);
    if (ft !== this.filterTypeIndex) {
      this.filterTypeIndex = ft;
      this.filterL = createFilter(ft, this.sampleRate);
      this.filterR = createFilter(ft, this.sampleRate);
    }
    const ft2 = Math.round(p.filter2Type);
    if (ft2 !== this.filter2TypeIndex) {
      this.filter2TypeIndex = ft2;
      this.filter2L = createFilter(ft2, this.sampleRate);
      this.filter2R = createFilter(ft2, this.sampleRate);
    }

    this.cutoffSmoother.setTarget(p.filterCutoff);
    this.cutoff2Smoother.setTarget(p.filter2Cutoff);
    this.ampEnvelope.setParams(p.ampAttack, p.ampDecay, p.ampSustain, p.ampRelease);
    this.filterEnvelope.setParams(
      p.filterEnvAttack,
      p.filterEnvDecay,
      p.filterEnvSustain,
      p.filterEnvRelease,
    );
    this._params = p;
  }

  processSample(): [number, number] {
    const p = this._params;
    if (!p) return [0, 0];

    const ampLevel = this.ampEnvelope.process();
    const filterEnvLevel = this.filterEnvelope.process();

    this.modMatrix.setSourceValue(ModSource.AMP_ENV, ampLevel);
    this.modMatrix.setSourceValue(ModSource.FILTER_ENV, filterEnvLevel);
    this.modMatrix.setSourceValue(ModSource.VELOCITY, this.velocity);
    this.modMatrix.setSourceValue(ModSource.KEY_TRACK, (this.note - 60) / 60);

    const modOscAPitch = this.modMatrix.getModulation(ModTarget.OSC_A_PITCH);
    const modOscAFrame = this.modMatrix.getModulation(ModTarget.OSC_A_FRAME);
    const modOscAWarp = this.modMatrix.getModulation(ModTarget.OSC_A_WARP_AMOUNT);
    const modOscALevel = this.modMatrix.getModulation(ModTarget.OSC_A_LEVEL);
    const modOscBPitch = this.modMatrix.getModulation(ModTarget.OSC_B_PITCH);
    const modOscBFrame = this.modMatrix.getModulation(ModTarget.OSC_B_FRAME);
    const modOscBWarp = this.modMatrix.getModulation(ModTarget.OSC_B_WARP_AMOUNT);
    const modOscBLevel = this.modMatrix.getModulation(ModTarget.OSC_B_LEVEL);
    const modOscCPitch = this.modMatrix.getModulation(ModTarget.OSC_C_PITCH);
    const modOscCFrame = this.modMatrix.getModulation(ModTarget.OSC_C_FRAME);
    const modOscCWarp = this.modMatrix.getModulation(ModTarget.OSC_C_WARP_AMOUNT);
    const modOscCLevel = this.modMatrix.getModulation(ModTarget.OSC_C_LEVEL);
    const modFilterCutoff = this.modMatrix.getModulation(ModTarget.FILTER_CUTOFF);
    const modFilterReso = this.modMatrix.getModulation(ModTarget.FILTER_RESONANCE);
    const modFilter2Cutoff = this.modMatrix.getModulation(ModTarget.FILTER2_CUTOFF);
    const modFilter2Reso = this.modMatrix.getModulation(ModTarget.FILTER2_RESONANCE);
    const modAmpLevel = this.modMatrix.getModulation(ModTarget.AMP_LEVEL);
    const modPan = this.modMatrix.getModulation(ModTarget.PAN);
    const modOscAPan = this.modMatrix.getModulation(ModTarget.OSC_A_PAN);
    const modOscBPan = this.modMatrix.getModulation(ModTarget.OSC_B_PAN);
    const modOscCPan = this.modMatrix.getModulation(ModTarget.OSC_C_PAN);
    const modOscAUniDet = this.modMatrix.getModulation(ModTarget.OSC_A_UNISON_DETUNE);
    const modOscBUniDet = this.modMatrix.getModulation(ModTarget.OSC_B_UNISON_DETUNE);
    const modOscCUniDet = this.modMatrix.getModulation(ModTarget.OSC_C_UNISON_DETUNE);
    const modOscAUniSpr = this.modMatrix.getModulation(ModTarget.OSC_A_UNISON_SPREAD);
    const modOscBUniSpr = this.modMatrix.getModulation(ModTarget.OSC_B_UNISON_SPREAD);
    const modOscCUniSpr = this.modMatrix.getModulation(ModTarget.OSC_C_UNISON_SPREAD);
    const modFilterDrive = this.modMatrix.getModulation(ModTarget.FILTER_DRIVE);
    const modFilter2Drive = this.modMatrix.getModulation(ModTarget.FILTER2_DRIVE);
    const modFilterEnvAmt = this.modMatrix.getModulation(ModTarget.FILTER_ENV_AMOUNT);
    const modFilter2EnvAmt = this.modMatrix.getModulation(ModTarget.FILTER2_ENV_AMOUNT);
    const modNoiseLevel = this.modMatrix.getModulation(ModTarget.NOISE_LEVEL);
    const modSubLevel = this.modMatrix.getModulation(ModTarget.SUB_LEVEL);
    const modOscAWarp2 = this.modMatrix.getModulation(ModTarget.OSC_A_WARP2_AMOUNT);
    const modOscBWarp2 = this.modMatrix.getModulation(ModTarget.OSC_B_WARP2_AMOUNT);
    const modOscCWarp2 = this.modMatrix.getModulation(ModTarget.OSC_C_WARP2_AMOUNT);

    let mixL = 0;
    let mixR = 0;

    if (p.oscAOn) {
      const pitchOffset = p.oscAOctave * 12 + p.oscASemitone + p.oscADetune / 100 + modOscAPitch;
      const freq = midiToFreq(this.note + pitchOffset);
      this.oscA.setFrequency(freq * (p.driftAmount > 0 ? this.drift.getFreqMultiplier() : 1));
      this.oscA.setFramePosition(clamp(p.oscAFramePosition + modOscAFrame, 0, 1));
      this.oscA.setUnisonCount(
        p.oscAUnisonVoices,
        clamp(p.oscAUnisonDetune + modOscAUniDet * 100, 0, 100),
        clamp(p.oscAUnisonSpread + modOscAUniSpr, 0, 1),
      );
      this.oscA.setWarp(
        p.oscAWarpType,
        clamp(p.oscAWarpAmount + modOscAWarp, 0, 1),
        p.oscAWarp2Type,
        clamp(p.oscAWarp2Amount + modOscAWarp2, 0, 1),
      );
      const [al, ar] = this.oscA.process();
      const aLevel = clamp(p.oscALevel + modOscALevel, 0, 1);
      const aPan = clamp(p.oscAPan + modOscAPan, -1, 1);
      const aPanR = 0.5 + aPan * 0.5;
      const aPanL = 1 - aPanR;
      mixL += al * aLevel * aPanL * 2;
      mixR += ar * aLevel * aPanR * 2;
    }

    if (p.oscBOn) {
      const pitchOffset = p.oscBOctave * 12 + p.oscBSemitone + p.oscBDetune / 100 + modOscBPitch;
      const freq = midiToFreq(this.note + pitchOffset);
      this.oscB.setFrequency(freq * (p.driftAmount > 0 ? this.drift.getFreqMultiplier() : 1));
      this.oscB.setFramePosition(clamp(p.oscBFramePosition + modOscBFrame, 0, 1));
      this.oscB.setUnisonCount(
        p.oscBUnisonVoices,
        clamp(p.oscBUnisonDetune + modOscBUniDet * 100, 0, 100),
        clamp(p.oscBUnisonSpread + modOscBUniSpr, 0, 1),
      );
      this.oscB.setWarp(
        p.oscBWarpType,
        clamp(p.oscBWarpAmount + modOscBWarp, 0, 1),
        p.oscBWarp2Type,
        clamp(p.oscBWarp2Amount + modOscBWarp2, 0, 1),
      );
      const [bl, br] = this.oscB.process();
      const bLevel = clamp(p.oscBLevel + modOscBLevel, 0, 1);
      const bPan = clamp(p.oscBPan + modOscBPan, -1, 1);
      const bPanR = 0.5 + bPan * 0.5;
      const bPanL = 1 - bPanR;
      mixL += bl * bLevel * bPanL * 2;
      mixR += br * bLevel * bPanR * 2;
    }

    if (p.oscCOn) {
      const pitchOffset = p.oscCOctave * 12 + p.oscCSemitone + p.oscCDetune / 100 + modOscCPitch;
      const freq = midiToFreq(this.note + pitchOffset);
      this.oscC.setFrequency(freq * (p.driftAmount > 0 ? this.drift.getFreqMultiplier() : 1));
      this.oscC.setFramePosition(clamp(p.oscCFramePosition + modOscCFrame, 0, 1));
      this.oscC.setUnisonCount(
        p.oscCUnisonVoices,
        clamp(p.oscCUnisonDetune + modOscCUniDet * 100, 0, 100),
        clamp(p.oscCUnisonSpread + modOscCUniSpr, 0, 1),
      );
      this.oscC.setWarp(
        p.oscCWarpType,
        clamp(p.oscCWarpAmount + modOscCWarp, 0, 1),
        p.oscCWarp2Type,
        clamp(p.oscCWarp2Amount + modOscCWarp2, 0, 1),
      );
      const [cl, cr] = this.oscC.process();
      const cLevel = clamp(p.oscCLevel + modOscCLevel, 0, 1);
      const cPan = clamp(p.oscCPan + modOscCPan, -1, 1);
      const cPanR = 0.5 + cPan * 0.5;
      const cPanL = 1 - cPanR;
      mixL += cl * cLevel * cPanL * 2;
      mixR += cr * cLevel * cPanR * 2;
    }

    if (p.subOn) {
      const subLvl = clamp(p.subLevel + modSubLevel, 0, 1);
      const s = this.sub.process() * subLvl;
      mixL += s;
      mixR += s;
    }

    if (p.noiseLevel > 0 || modNoiseLevel > 0) {
      const noiseLvl = clamp(p.noiseLevel + modNoiseLevel, 0, 1);
      const n = this.noise.process(p.noiseType) * noiseLvl;
      mixL += n;
      mixR += n;
    }

    // Filter 1
    if (p.filterOn) {
      const drive = clamp(p.filterDrive + modFilterDrive * 9, 1, 10);
      if (drive > 1) {
        mixL = Math.tanh(mixL * drive) / drive;
        mixR = Math.tanh(mixR * drive) / drive;
      }
      const baseCutoff = this.cutoffSmoother.tick();
      const envAmt = clamp(p.filterEnvAmount + modFilterEnvAmt, -1, 1);
      const envMod = filterEnvLevel * envAmt;
      const cutoff = clamp(
        baseCutoff * 2 ** ((envMod + modFilterCutoff) * 7),
        20,
        this.sampleRate * 0.49,
      );
      const reso = clamp(p.filterResonance + modFilterReso * 0.99, 0, 0.99);
      this.filterL.setParams(cutoff, reso, this.sampleRate);
      this.filterR.setParams(cutoff, reso, this.sampleRate);
      mixL = this.filterL.process(mixL);
      mixR = this.filterR.process(mixR);
    }

    // Filter 2 (series)
    if (p.filter2On) {
      const drive2 = clamp(p.filter2Drive + modFilter2Drive * 9, 1, 10);
      if (drive2 > 1) {
        mixL = Math.tanh(mixL * drive2) / drive2;
        mixR = Math.tanh(mixR * drive2) / drive2;
      }
      const baseCutoff2 = this.cutoff2Smoother.tick();
      const envAmt2 = clamp(p.filter2EnvAmount + modFilter2EnvAmt, -1, 1);
      const envMod2 = filterEnvLevel * envAmt2;
      const cutoff2 = clamp(
        baseCutoff2 * 2 ** ((envMod2 + modFilter2Cutoff) * 7),
        20,
        this.sampleRate * 0.49,
      );
      const reso2 = clamp(p.filter2Resonance + modFilter2Reso * 0.99, 0, 0.99);
      this.filter2L.setParams(cutoff2, reso2, this.sampleRate);
      this.filter2R.setParams(cutoff2, reso2, this.sampleRate);
      mixL = this.filter2L.process(mixL);
      mixR = this.filter2R.process(mixR);
    }

    // Amp
    const level = this.levelSmoother.tick();
    const ampMod = clamp(1 + modAmpLevel * 2, 0, 3);
    mixL *= ampLevel * level * this.velocity * ampMod;
    mixR *= ampLevel * level * this.velocity * ampMod;

    // Global Pan
    const panVal = clamp(modPan, -1, 1);
    if (panVal !== 0) {
      const panR = clamp(0.5 + panVal * 0.5, 0, 1);
      const panL = 1 - panR;
      const mono = (mixL + mixR) * 0.5;
      mixL = mono * panL * 2;
      mixR = mono * panR * 2;
    }

    // Voice-steal fade
    if (this.fadeOut > 0) {
      const fade = this.fadeOut / this.FADE_SAMPLES;
      mixL *= fade;
      mixR *= fade;
      this.fadeOut--;
    }

    if (p.driftAmount > 0) this.drift.process();

    return [mixL, mixR];
  }
}
