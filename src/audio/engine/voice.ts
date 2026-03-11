import { ADSREnvelope } from "../dsp/envelope/adsr";
import { FilterType, SVFilter } from "../dsp/filter/svf";
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

  subOn: boolean;
  subOctave: number;
  subLevel: number;

  noiseType: NoiseType;
  noiseLevel: number;

  filterCutoff: number;
  filterResonance: number;
  filterDrive: number;
  filterType: FilterType;
  filterEnvAmount: number;

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
  readonly sub: SubOscillator;
  readonly noise: NoiseGenerator;
  readonly filterL: SVFilter;
  readonly filterR: SVFilter;
  readonly ampEnvelope: ADSREnvelope;
  readonly filterEnvelope: ADSREnvelope;
  readonly modMatrix: ModulationMatrix;
  readonly drift: AnalogDrift;

  private levelSmoother: ParamSmoother;
  private cutoffSmoother: ParamSmoother;

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
    this.sub = new SubOscillator(sampleRate);
    this.noise = new NoiseGenerator();
    this.filterL = new SVFilter(sampleRate);
    this.filterR = new SVFilter(sampleRate);
    this.ampEnvelope = new ADSREnvelope(sampleRate);
    this.filterEnvelope = new ADSREnvelope(sampleRate);
    this.modMatrix = new ModulationMatrix();
    this.drift = new AnalogDrift(sampleRate);
    this.levelSmoother = new ParamSmoother(0.8);
    this.cutoffSmoother = new ParamSmoother(8000);

    this.ampEnvelope.setParams(0.01, 0.1, 0.7, 0.3);
    this.filterEnvelope.setParams(0.01, 0.1, 0, 0.3);
    this.filterL.setParams(8000, 0, 1, FilterType.LOWPASS);
    this.filterR.setParams(8000, 0, 1, FilterType.LOWPASS);
  }

  setWavetableA(wt: Wavetable): void {
    this.oscA.setWavetable(wt);
  }

  setWavetableB(wt: Wavetable): void {
    this.oscB.setWavetable(wt);
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
    this.sub.setNote(note, -1);

    this.oscA.resetPhases();
    this.oscB.resetPhases();
    this.sub.resetPhase();
    this.filterL.reset();
    this.filterR.reset();

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
    // Unison config (count/detune/spread not modulated per-sample)
    this.oscA.setUnisonCount(p.oscAUnisonVoices, p.oscAUnisonDetune, p.oscAUnisonSpread);
    this.oscB.setUnisonCount(p.oscBUnisonVoices, p.oscBUnisonDetune, p.oscBUnisonSpread);

    if (this.note >= 0) {
      this.sub.setNote(this.note, p.subOctave);
    }

    this.cutoffSmoother.setTarget(p.filterCutoff);
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

    // Set mod sources
    this.modMatrix.setSourceValue(ModSource.AMP_ENV, ampLevel);
    this.modMatrix.setSourceValue(ModSource.FILTER_ENV, filterEnvLevel);
    this.modMatrix.setSourceValue(ModSource.VELOCITY, this.velocity);
    this.modMatrix.setSourceValue(ModSource.KEY_TRACK, (this.note - 60) / 60);

    // Read modulation for all targets
    const modOscAPitch = this.modMatrix.getModulation(ModTarget.OSC_A_PITCH);
    const modOscAFrame = this.modMatrix.getModulation(ModTarget.OSC_A_FRAME);
    const modOscAWarp = this.modMatrix.getModulation(ModTarget.OSC_A_WARP_AMOUNT);
    const modOscALevel = this.modMatrix.getModulation(ModTarget.OSC_A_LEVEL);
    const modOscBPitch = this.modMatrix.getModulation(ModTarget.OSC_B_PITCH);
    const modOscBFrame = this.modMatrix.getModulation(ModTarget.OSC_B_FRAME);
    const modOscBWarp = this.modMatrix.getModulation(ModTarget.OSC_B_WARP_AMOUNT);
    const modOscBLevel = this.modMatrix.getModulation(ModTarget.OSC_B_LEVEL);
    const modFilterCutoff = this.modMatrix.getModulation(ModTarget.FILTER_CUTOFF);
    const modFilterReso = this.modMatrix.getModulation(ModTarget.FILTER_RESONANCE);
    const modAmpLevel = this.modMatrix.getModulation(ModTarget.AMP_LEVEL);
    const modPan = this.modMatrix.getModulation(ModTarget.PAN);

    let mixL = 0;
    let mixR = 0;

    if (p.oscAOn) {
      // Pitch: ±48 semitones (4 octaves)
      const detuneTotal = p.oscADetune / 100 + modOscAPitch * 48;
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
      const detuneTotal = p.oscBDetune / 100 + modOscBPitch * 48;
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

    if (p.subOn) {
      const subSample = this.sub.process() * p.subLevel;
      mixL += subSample;
      mixR += subSample;
    }

    if (p.noiseLevel > 0) {
      const noiseSample = this.noise.process(p.noiseType) * p.noiseLevel;
      mixL += noiseSample;
      mixR += noiseSample;
    }

    // Drive (pre-filter saturation)
    if (p.filterDrive > 1) {
      mixL = Math.tanh(mixL * p.filterDrive) / p.filterDrive;
      mixR = Math.tanh(mixR * p.filterDrive) / p.filterDrive;
    }

    // Filter with modulation — exponential cutoff scaling for musical response
    const baseCutoff = this.cutoffSmoother.tick();
    const envMod = filterEnvLevel * p.filterEnvAmount;
    const totalMod = envMod + modFilterCutoff;
    // Each unit of totalMod = ±7 octaves of cutoff shift (2^7 = 128x)
    const cutoff = clamp(baseCutoff * 2 ** (totalMod * 7), 20, this.sampleRate * 0.49);
    const resonance = clamp(p.filterResonance + modFilterReso * 0.99, 0, 0.99);
    this.filterL.setParams(cutoff, resonance, 1, p.filterType);
    this.filterR.setParams(cutoff, resonance, 1, p.filterType);
    mixL = this.filterL.process(mixL);
    mixR = this.filterR.process(mixR);

    // Amp with modulation — full range (0 to 3x for overdrive)
    const level = this.levelSmoother.tick();
    const ampMod = clamp(1 + modAmpLevel * 2, 0, 3);
    mixL *= ampLevel * level * this.velocity * ampMod;
    mixR *= ampLevel * level * this.velocity * ampMod;

    // Pan modulation — full stereo range
    const panVal = clamp(modPan, -1, 1);
    if (panVal !== 0) {
      const panR = clamp(0.5 + panVal * 0.5, 0, 1);
      const panL = 1 - panR;
      // Apply pan as cross-fade from center
      const mono = (mixL + mixR) * 0.5;
      mixL = mono * panL * 2;
      mixR = mono * panR * 2;
    }

    // Fade out (voice stealing)
    if (this.fadeOut > 0) {
      const fade = this.fadeOut / this.FADE_SAMPLES;
      mixL *= fade;
      mixR *= fade;
      this.fadeOut--;
    }

    if (p.driftAmount > 0) {
      this.drift.process();
    }

    return [mixL, mixR];
  }
}
