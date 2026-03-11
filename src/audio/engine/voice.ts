import { Oscillator } from "../dsp/oscillator/oscillator";
import { SVFilter, FilterType } from "../dsp/filter/svf";
import { ADSREnvelope } from "../dsp/envelope/adsr";
import { ParamSmoother } from "../dsp/utils/smoothing";
import type { Wavetable } from "../dsp/wavetable/wavetableEngine";

export class Voice {
  readonly oscillator: Oscillator;
  readonly filter: SVFilter;
  readonly ampEnvelope: ADSREnvelope;

  private levelSmoother: ParamSmoother;
  private cutoffSmoother: ParamSmoother;

  private note = -1;
  private sampleRate: number;

  constructor(sampleRate: number) {
    this.sampleRate = sampleRate;
    this.oscillator = new Oscillator(sampleRate);
    this.filter = new SVFilter(sampleRate);
    this.ampEnvelope = new ADSREnvelope(sampleRate);
    this.levelSmoother = new ParamSmoother(0.8);
    this.cutoffSmoother = new ParamSmoother(8000);
  }

  setWavetable(wt: Wavetable): void {
    this.oscillator.setWavetable(wt);
  }

  noteOn(note: number, velocity: number): void {
    this.note = note;
    this.oscillator.setFrequency(midiToFreq(note));
    this.oscillator.resetPhase();
    this.filter.reset();
    this.ampEnvelope.gate();
  }

  noteOff(): void {
    this.ampEnvelope.release();
  }

  isIdle(): boolean {
    return this.ampEnvelope.isIdle();
  }

  getNote(): number {
    return this.note;
  }

  setParams(
    level: number,
    cutoff: number,
    resonance: number,
    drive: number,
    filterType: FilterType,
    attack: number,
    decay: number,
    sustain: number,
    release: number,
  ): void {
    this.levelSmoother.setTarget(level);
    this.cutoffSmoother.setTarget(cutoff);
    this.filter.setParams(cutoff, resonance, drive, filterType);
    this.ampEnvelope.setParams(attack, decay, sustain, release);
  }

  processSample(): number {
    const oscOut = this.oscillator.process();
    const filterOut = this.filter.process(oscOut);
    const envLevel = this.ampEnvelope.process();
    const level = this.levelSmoother.tick();
    return filterOut * envLevel * level;
  }
}

function midiToFreq(note: number): number {
  return 440 * 2 ** ((note - 69) / 12);
}
