import { ADSREnvelope } from "../dsp/envelope/adsr";
import { createFilter } from "../dsp/filter/filterRegistry";
import type { FilterProcessor } from "../dsp/filter/filterTypes";
import { ModSource, ModTarget, ModulationMatrix } from "../dsp/modulation/modMatrix";
import { SubOscillator } from "../dsp/oscillator/subOscillator";
import { UnisonEngine, type UnisonParams } from "../dsp/oscillator/unisonEngine";
import { AnalogDrift } from "../dsp/utils/drift";
import { clamp, midiToFreq } from "../dsp/utils/math";
import { NoiseGenerator, type NoiseType } from "../dsp/utils/noise";
import { ParamSmoother } from "../dsp/utils/smoothing";
import type { DistortionType } from "../dsp/warp/warpTypes";
import type { Wavetable } from "../dsp/wavetable/wavetablePresets";

export interface VoiceParams {
  oscAOn: boolean;
  oscALevel: number;
  oscAFramePosition: number;
  oscATune: number; // ±100 cents fine tune
  oscATranspose: number; // ±48 semitones (integer)
  oscAPhaseOffset: number;
  oscARandomPhase: number;
  oscAUnisonVoices: number;
  oscAUnisonDetune: number; // 0-1 normalized
  oscAUnisonBlend: number;
  oscAUnisonSpread: number;
  oscAUnisonStackType: number;
  oscAUnisonDetunePower: number;
  oscAUnisonDetuneRange: number;
  oscAUnisonFrameSpread: number;
  oscADistortionType: DistortionType;
  oscADistortionAmount: number;
  oscADistortionPhase: number;
  oscAPan: number;
  oscADestination: number; // 0=F1, 1=F2, 2=Dual, 3=Effects(bypass)

  oscBOn: boolean;
  oscBLevel: number;
  oscBFramePosition: number;
  oscBTune: number;
  oscBTranspose: number;
  oscBPhaseOffset: number;
  oscBRandomPhase: number;
  oscBUnisonVoices: number;
  oscBUnisonDetune: number;
  oscBUnisonBlend: number;
  oscBUnisonSpread: number;
  oscBUnisonStackType: number;
  oscBUnisonDetunePower: number;
  oscBUnisonDetuneRange: number;
  oscBUnisonFrameSpread: number;
  oscBDistortionType: DistortionType;
  oscBDistortionAmount: number;
  oscBDistortionPhase: number;
  oscBPan: number;
  oscBDestination: number;

  oscCOn: boolean;
  oscCLevel: number;
  oscCFramePosition: number;
  oscCTune: number;
  oscCTranspose: number;
  oscCPhaseOffset: number;
  oscCRandomPhase: number;
  oscCUnisonVoices: number;
  oscCUnisonDetune: number;
  oscCUnisonBlend: number;
  oscCUnisonSpread: number;
  oscCUnisonStackType: number;
  oscCUnisonDetunePower: number;
  oscCUnisonDetuneRange: number;
  oscCUnisonFrameSpread: number;
  oscCDistortionType: DistortionType;
  oscCDistortionAmount: number;
  oscCDistortionPhase: number;
  oscCPan: number;
  oscCDestination: number;

  subOn: boolean;
  subOctave: number;
  subLevel: number;

  noiseType: NoiseType;
  noiseLevel: number;

  filterCutoff: number;
  filterResonance: number;
  filterDrive: number;
  filterType: number;
  filterBlend: number;
  filterStyle: number;
  filterEnvAmount: number;
  filterOn: boolean;
  filter1Input: number; // bitmask: bit3=noise, bit4+ unused for oscs

  filter2Cutoff: number;
  filter2Resonance: number;
  filter2Drive: number;
  filter2Type: number;
  filter2Blend: number;
  filter2Style: number;
  filter2EnvAmount: number;
  filter2On: boolean;
  filter2Input: number; // bit4 = chain from filter1

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
    this.oscA.setUnisonParams({
      count: p.oscAUnisonVoices,
      detune: p.oscAUnisonDetune,
      blend: p.oscAUnisonBlend,
      stereoSpread: p.oscAUnisonSpread,
      stackType: p.oscAUnisonStackType,
      detunePower: p.oscAUnisonDetunePower,
      detuneRange: p.oscAUnisonDetuneRange,
      frameSpread: p.oscAUnisonFrameSpread,
    });
    this.oscB.setUnisonParams({
      count: p.oscBUnisonVoices,
      detune: p.oscBUnisonDetune,
      blend: p.oscBUnisonBlend,
      stereoSpread: p.oscBUnisonSpread,
      stackType: p.oscBUnisonStackType,
      detunePower: p.oscBUnisonDetunePower,
      detuneRange: p.oscBUnisonDetuneRange,
      frameSpread: p.oscBUnisonFrameSpread,
    });
    this.oscC.setUnisonParams({
      count: p.oscCUnisonVoices,
      detune: p.oscCUnisonDetune,
      blend: p.oscCUnisonBlend,
      stereoSpread: p.oscCUnisonSpread,
      stackType: p.oscCUnisonStackType,
      detunePower: p.oscCUnisonDetunePower,
      detuneRange: p.oscCUnisonDetuneRange,
      frameSpread: p.oscCUnisonFrameSpread,
    });

    this.oscA.setPhaseParams(p.oscAPhaseOffset, p.oscARandomPhase);
    this.oscB.setPhaseParams(p.oscBPhaseOffset, p.oscBRandomPhase);
    this.oscC.setPhaseParams(p.oscCPhaseOffset, p.oscCRandomPhase);

    if (this.note >= 0) this.sub.setNote(this.note, p.subOctave);

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
    const modOscADist = this.modMatrix.getModulation(ModTarget.OSC_A_WARP_AMOUNT);
    const modOscALevel = this.modMatrix.getModulation(ModTarget.OSC_A_LEVEL);
    const modOscADistPhase = this.modMatrix.getModulation(ModTarget.OSC_A_DISTORTION_PHASE);
    const modOscBPitch = this.modMatrix.getModulation(ModTarget.OSC_B_PITCH);
    const modOscBFrame = this.modMatrix.getModulation(ModTarget.OSC_B_FRAME);
    const modOscBDist = this.modMatrix.getModulation(ModTarget.OSC_B_WARP_AMOUNT);
    const modOscBLevel = this.modMatrix.getModulation(ModTarget.OSC_B_LEVEL);
    const modOscBDistPhase = this.modMatrix.getModulation(ModTarget.OSC_B_DISTORTION_PHASE);
    const modOscCPitch = this.modMatrix.getModulation(ModTarget.OSC_C_PITCH);
    const modOscCFrame = this.modMatrix.getModulation(ModTarget.OSC_C_FRAME);
    const modOscCDist = this.modMatrix.getModulation(ModTarget.OSC_C_WARP_AMOUNT);
    const modOscCLevel = this.modMatrix.getModulation(ModTarget.OSC_C_LEVEL);
    const modOscCDistPhase = this.modMatrix.getModulation(ModTarget.OSC_C_DISTORTION_PHASE);
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

    // Cross-oscillator FM/RM signals (1-sample delay — inaudible at 44.1kHz)
    const prevOscAOut = this.oscA.getLastOutput();
    const prevOscBOut = this.oscB.getLastOutput();

    // Noise (generated once per sample for FM_SAMPLE/RM_SAMPLE use)
    let noiseSample = 0;
    let noiseL = 0;
    let noiseR = 0;
    if (p.noiseLevel > 0 || modNoiseLevel > 0) {
      const noiseLvl = clamp(p.noiseLevel + modNoiseLevel, 0, 1);
      noiseSample = this.noise.process(p.noiseType);
      noiseL = noiseSample * noiseLvl;
      noiseR = noiseSample * noiseLvl;
    }

    // Helper: resolve FM signal for given distortion type
    const getFMSignal = (distType: number): number => {
      if (distType === 7 || distType === 10) return prevOscAOut; // FM/RM ← OscA
      if (distType === 8 || distType === 11) return prevOscBOut; // FM/RM ← OscB
      if (distType === 9 || distType === 12) return noiseSample; // FM/RM ← Sample
      return 0;
    };

    // Filter routing accumulators
    let f1InL = 0,
      f1InR = 0;
    let f2InL = 0,
      f2InR = 0;
    let directL = 0,
      directR = 0;

    const routeOsc = (l: number, r: number, dest: number) => {
      switch (dest) {
        case 1: // Filter2
          if (p.filter2On) {
            f2InL += l;
            f2InR += r;
          } else {
            directL += l;
            directR += r;
          }
          break;
        case 2: // Dual
          if (p.filterOn) {
            f1InL += l;
            f1InR += r;
          }
          if (p.filter2On) {
            f2InL += l;
            f2InR += r;
          }
          if (!p.filterOn && !p.filter2On) {
            directL += l;
            directR += r;
          }
          break;
        case 3: // Bypass filters
          directL += l;
          directR += r;
          break;
        default: // 0 = Filter1
          if (p.filterOn) {
            f1InL += l;
            f1InR += r;
          } else {
            directL += l;
            directR += r;
          }
          break;
      }
    };

    // --- Process Oscillator A ---
    if (p.oscAOn) {
      const pitchOffset = Math.round(p.oscATranspose) + p.oscATune / 100 + modOscAPitch;
      const freq = midiToFreq(this.note + pitchOffset);
      this.oscA.setFrequency(freq * (p.driftAmount > 0 ? this.drift.getFreqMultiplier() : 1));
      this.oscA.setFramePosition(clamp(p.oscAFramePosition + modOscAFrame, 0, 1));
      this.oscA.setUnisonParams({
        count: p.oscAUnisonVoices,
        detune: clamp(p.oscAUnisonDetune + modOscAUniDet, 0, 1),
        blend: p.oscAUnisonBlend,
        stereoSpread: clamp(p.oscAUnisonSpread + modOscAUniSpr, 0, 1),
        stackType: p.oscAUnisonStackType,
        detunePower: p.oscAUnisonDetunePower,
        detuneRange: p.oscAUnisonDetuneRange,
        frameSpread: p.oscAUnisonFrameSpread,
      });
      this.oscA.setDistortion(
        p.oscADistortionType,
        clamp(p.oscADistortionAmount + modOscADist, 0, 1),
        clamp(p.oscADistortionPhase + modOscADistPhase, 0, 1),
      );
      const [al, ar] = this.oscA.process(getFMSignal(p.oscADistortionType));
      const aLevel = clamp(p.oscALevel + modOscALevel, 0, 1);
      const aPan = clamp(p.oscAPan + modOscAPan, -1, 1);
      const aPanR = 0.5 + aPan * 0.5;
      routeOsc(al * aLevel * (1 - aPanR) * 2, ar * aLevel * aPanR * 2, p.oscADestination);
    }

    // --- Process Oscillator B ---
    if (p.oscBOn) {
      const pitchOffset = Math.round(p.oscBTranspose) + p.oscBTune / 100 + modOscBPitch;
      const freq = midiToFreq(this.note + pitchOffset);
      this.oscB.setFrequency(freq * (p.driftAmount > 0 ? this.drift.getFreqMultiplier() : 1));
      this.oscB.setFramePosition(clamp(p.oscBFramePosition + modOscBFrame, 0, 1));
      this.oscB.setUnisonParams({
        count: p.oscBUnisonVoices,
        detune: clamp(p.oscBUnisonDetune + modOscBUniDet, 0, 1),
        blend: p.oscBUnisonBlend,
        stereoSpread: clamp(p.oscBUnisonSpread + modOscBUniSpr, 0, 1),
        stackType: p.oscBUnisonStackType,
        detunePower: p.oscBUnisonDetunePower,
        detuneRange: p.oscBUnisonDetuneRange,
        frameSpread: p.oscBUnisonFrameSpread,
      });
      this.oscB.setDistortion(
        p.oscBDistortionType,
        clamp(p.oscBDistortionAmount + modOscBDist, 0, 1),
        clamp(p.oscBDistortionPhase + modOscBDistPhase, 0, 1),
      );
      const [bl, br] = this.oscB.process(getFMSignal(p.oscBDistortionType));
      const bLevel = clamp(p.oscBLevel + modOscBLevel, 0, 1);
      const bPan = clamp(p.oscBPan + modOscBPan, -1, 1);
      const bPanR = 0.5 + bPan * 0.5;
      routeOsc(bl * bLevel * (1 - bPanR) * 2, br * bLevel * bPanR * 2, p.oscBDestination);
    }

    // --- Process Oscillator C ---
    if (p.oscCOn) {
      const pitchOffset = Math.round(p.oscCTranspose) + p.oscCTune / 100 + modOscCPitch;
      const freq = midiToFreq(this.note + pitchOffset);
      this.oscC.setFrequency(freq * (p.driftAmount > 0 ? this.drift.getFreqMultiplier() : 1));
      this.oscC.setFramePosition(clamp(p.oscCFramePosition + modOscCFrame, 0, 1));
      this.oscC.setUnisonParams({
        count: p.oscCUnisonVoices,
        detune: clamp(p.oscCUnisonDetune + modOscCUniDet, 0, 1),
        blend: p.oscCUnisonBlend,
        stereoSpread: clamp(p.oscCUnisonSpread + modOscCUniSpr, 0, 1),
        stackType: p.oscCUnisonStackType,
        detunePower: p.oscCUnisonDetunePower,
        detuneRange: p.oscCUnisonDetuneRange,
        frameSpread: p.oscCUnisonFrameSpread,
      });
      this.oscC.setDistortion(
        p.oscCDistortionType,
        clamp(p.oscCDistortionAmount + modOscCDist, 0, 1),
        clamp(p.oscCDistortionPhase + modOscCDistPhase, 0, 1),
      );
      const [cl, cr] = this.oscC.process(getFMSignal(p.oscCDistortionType));
      const cLevel = clamp(p.oscCLevel + modOscCLevel, 0, 1);
      const cPan = clamp(p.oscCPan + modOscCPan, -1, 1);
      const cPanR = 0.5 + cPan * 0.5;
      routeOsc(cl * cLevel * (1 - cPanR) * 2, cr * cLevel * cPanR * 2, p.oscCDestination);
    }

    // Sub (always bypasses filters)
    let subL = 0,
      subR = 0;
    if (p.subOn) {
      const subLvl = clamp(p.subLevel + modSubLevel, 0, 1);
      const s = this.sub.process() * subLvl;
      subL = s;
      subR = s;
    }

    // Noise routing (bit3 in filter1Input routes noise to filter1)
    if (noiseL !== 0 || noiseR !== 0) {
      if (p.filterOn && p.filter1Input & 8) {
        f1InL += noiseL;
        f1InR += noiseR;
      } else if (p.filter2On && p.filter2Input & 8) {
        f2InL += noiseL;
        f2InR += noiseR;
      } else {
        directL += noiseL;
        directR += noiseR;
      }
    }

    // Filter 1
    let f1OutL = 0,
      f1OutR = 0;
    if (p.filterOn) {
      const drive = clamp(p.filterDrive + modFilterDrive * 9, 1, 10);
      const baseCutoff = this.cutoffSmoother.tick();
      const envAmt = clamp(p.filterEnvAmount + modFilterEnvAmt, -1, 1);
      const cutoff = clamp(
        baseCutoff * 2 ** ((filterEnvLevel * envAmt + modFilterCutoff) * 7),
        20,
        this.sampleRate * 0.49,
      );
      const reso = clamp(p.filterResonance + modFilterReso * 0.99, 0, 0.99);
      this.filterL.setParams(cutoff, reso, drive, p.filterBlend, p.filterStyle, this.sampleRate);
      this.filterR.setParams(cutoff, reso, drive, p.filterBlend, p.filterStyle, this.sampleRate);
      f1OutL = this.filterL.process(f1InL);
      f1OutR = this.filterR.process(f1InR);
    } else {
      this.cutoffSmoother.tick();
    }

    // Filter 2
    let f2OutL = 0,
      f2OutR = 0;
    if (p.filter2On) {
      const f2in = p.filter2Input;
      if (f2in & 16) {
        f2InL += f1OutL;
        f2InR += f1OutR;
      } // chain from F1

      const drive2 = clamp(p.filter2Drive + modFilter2Drive * 9, 1, 10);
      const baseCutoff2 = this.cutoff2Smoother.tick();
      const envAmt2 = clamp(p.filter2EnvAmount + modFilter2EnvAmt, -1, 1);
      const cutoff2 = clamp(
        baseCutoff2 * 2 ** ((filterEnvLevel * envAmt2 + modFilter2Cutoff) * 7),
        20,
        this.sampleRate * 0.49,
      );
      const reso2 = clamp(p.filter2Resonance + modFilter2Reso * 0.99, 0, 0.99);
      this.filter2L.setParams(
        cutoff2,
        reso2,
        drive2,
        p.filter2Blend,
        p.filter2Style,
        this.sampleRate,
      );
      this.filter2R.setParams(
        cutoff2,
        reso2,
        drive2,
        p.filter2Blend,
        p.filter2Style,
        this.sampleRate,
      );
      f2OutL = this.filter2L.process(f2InL);
      f2OutR = this.filter2R.process(f2InR);

      // If f1 wasn't chained into f2, add f1 output to direct
      if (!(p.filter2Input & 16)) {
        directL += f1OutL;
        directR += f1OutR;
      }
    } else {
      this.cutoff2Smoother.tick();
      // f1 output goes to mix if f2 isn't chaining
      directL += f1OutL;
      directR += f1OutR;
    }

    let mixL = directL + f2OutL + subL;
    let mixR = directR + f2OutR + subR;

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
