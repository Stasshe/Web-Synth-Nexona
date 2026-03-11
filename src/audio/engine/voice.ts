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
import type { Wavetable } from "../dsp/wavetable/wavetableEngine";

export interface VoiceParams {
  oscAOn: boolean;
  oscALevel: number;
  oscAFramePosition: number;
  oscADetune: number;
  oscAUnisonVoices: number;
  oscAUnisonDetune: number;
  oscAUnisonSpread: number;
  oscAWarpType: WarpType;
  oscAWarpAmount: number;
  oscAWarp2Type: WarpType;
  oscAWarp2Amount: number;

  oscBOn: boolean;
  oscBLevel: number;
  oscBFramePosition: number;
  oscBDetune: number;
  oscBUnisonVoices: number;
  oscBUnisonDetune: number;
  oscBUnisonSpread: number;
  oscBWarpType: WarpType;
  oscBWarpAmount: number;
  oscBWarp2Type: WarpType;
  oscBWarp2Amount: number;

  oscCOn: boolean;
  oscCLevel: number;
  oscCFramePosition: number;
  oscCDetune: number;
  oscCUnisonVoices: number;
  oscCUnisonDetune: number;
  oscCUnisonSpread: number;
  oscCWarpType: WarpType;
  oscCWarpAmount: number;
  oscCWarp2Type: WarpType;
  oscCWarp2Amount: number;

  subOn: boolean;
  subOctave: number;
  subLevel: number;

  noiseType: NoiseType;
  noiseLevel: number;

  filterCutoff: number;
  filterResonance: number;
  filterDrive: number;
  filterType: number; // index into FILTER_REGISTRY
  filterEnvAmount: number;
  filterOn: boolean;

  filter2Cutoff: number;
  filter2Resonance: number;
  filter2Drive: number;
  filter2Type: number; // index into FILTER_REGISTRY
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

    let mixL = 0;
    let mixR = 0;

    if (p.oscAOn) {
      const detuneTotal = p.oscADetune / 100 + modOscAPitch;
      const freq = midiToFreq(this.note + detuneTotal);
      this.oscA.setFrequency(freq * (p.driftAmount > 0 ? this.drift.getFreqMultiplier() : 1));
      this.oscA.setFramePosition(clamp(p.oscAFramePosition + modOscAFrame, 0, 1));
      this.oscA.setWarp(
        p.oscAWarpType,
        clamp(p.oscAWarpAmount + modOscAWarp, 0, 1),
        p.oscAWarp2Type,
        p.oscAWarp2Amount,
      );
      const [al, ar] = this.oscA.process();
      const aLevel = clamp(p.oscALevel + modOscALevel, 0, 1);
      mixL += al * aLevel;
      mixR += ar * aLevel;
    }

    if (p.oscBOn) {
      const detuneTotal = p.oscBDetune / 100 + modOscBPitch;
      const freq = midiToFreq(this.note + detuneTotal);
      this.oscB.setFrequency(freq * (p.driftAmount > 0 ? this.drift.getFreqMultiplier() : 1));
      this.oscB.setFramePosition(clamp(p.oscBFramePosition + modOscBFrame, 0, 1));
      this.oscB.setWarp(
        p.oscBWarpType,
        clamp(p.oscBWarpAmount + modOscBWarp, 0, 1),
        p.oscBWarp2Type,
        p.oscBWarp2Amount,
      );
      const [bl, br] = this.oscB.process();
      const bLevel = clamp(p.oscBLevel + modOscBLevel, 0, 1);
      mixL += bl * bLevel;
      mixR += br * bLevel;
    }

    if (p.oscCOn) {
      const detuneTotal = p.oscCDetune / 100 + modOscCPitch;
      const freq = midiToFreq(this.note + detuneTotal);
      this.oscC.setFrequency(freq * (p.driftAmount > 0 ? this.drift.getFreqMultiplier() : 1));
      this.oscC.setFramePosition(clamp(p.oscCFramePosition + modOscCFrame, 0, 1));
      this.oscC.setWarp(
        p.oscCWarpType,
        clamp(p.oscCWarpAmount + modOscCWarp, 0, 1),
        p.oscCWarp2Type,
        p.oscCWarp2Amount,
      );
      const [cl, cr] = this.oscC.process();
      const cLevel = clamp(p.oscCLevel + modOscCLevel, 0, 1);
      mixL += cl * cLevel;
      mixR += cr * cLevel;
    }

    if (p.subOn) {
      const s = this.sub.process() * p.subLevel;
      mixL += s;
      mixR += s;
    }

    if (p.noiseLevel > 0) {
      const n = this.noise.process(p.noiseType) * p.noiseLevel;
      mixL += n;
      mixR += n;
    }

    // Filter 1
    if (p.filterOn) {
      if (p.filterDrive > 1) {
        mixL = Math.tanh(mixL * p.filterDrive) / p.filterDrive;
        mixR = Math.tanh(mixR * p.filterDrive) / p.filterDrive;
      }
      const baseCutoff = this.cutoffSmoother.tick();
      const envMod = filterEnvLevel * p.filterEnvAmount;
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
      if (p.filter2Drive > 1) {
        mixL = Math.tanh(mixL * p.filter2Drive) / p.filter2Drive;
        mixR = Math.tanh(mixR * p.filter2Drive) / p.filter2Drive;
      }
      const baseCutoff2 = this.cutoff2Smoother.tick();
      const envMod2 = filterEnvLevel * p.filter2EnvAmount;
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

    // Pan
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
