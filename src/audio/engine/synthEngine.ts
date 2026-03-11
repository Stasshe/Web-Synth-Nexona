import { Voice } from "./voice";
import { getParam, SabParam } from "../sab/layout";
import { FilterType } from "../dsp/filter/svf";
import { generateSineTable } from "../dsp/wavetable/wavetableEngine";
import { ParamSmoother } from "../dsp/utils/smoothing";
import type { Wavetable } from "../dsp/wavetable/wavetableEngine";

export class SynthEngine {
  private voice: Voice;
  private sab: Int32Array | null = null;
  private sampleRate: number;
  private masterVolume: ParamSmoother;
  private wavetable: Wavetable;

  constructor(sampleRate: number) {
    this.sampleRate = sampleRate;
    this.voice = new Voice(sampleRate);
    this.masterVolume = new ParamSmoother(0.8);
    this.wavetable = generateSineTable(2048);
    this.voice.setWavetable(this.wavetable);
  }

  setSAB(sab: Int32Array): void {
    this.sab = sab;
  }

  noteOn(note: number, velocity: number): void {
    this.voice.noteOn(note, velocity);
  }

  noteOff(note: number): void {
    if (this.voice.getNote() === note) {
      this.voice.noteOff();
    }
  }

  processBlock(output: Float32Array[]): void {
    const left = output[0];
    const right = output[1];
    const blockSize = left.length;

    this.readParams();

    for (let i = 0; i < blockSize; i++) {
      const sample = this.voice.isIdle() ? 0 : this.voice.processSample();
      const master = this.masterVolume.tick();
      const out = sample * master;
      left[i] = out;
      right[i] = out;
    }
  }

  private readParams(): void {
    if (!this.sab) return;

    this.masterVolume.setTarget(getParam(this.sab, SabParam.MasterVolume));

    const level = getParam(this.sab, SabParam.OscALevel);
    const cutoff = getParam(this.sab, SabParam.FilterCutoff);
    const resonance = getParam(this.sab, SabParam.FilterResonance);
    const drive = getParam(this.sab, SabParam.FilterDrive);
    const filterType = getParam(this.sab, SabParam.FilterType) as FilterType;
    const attack = getParam(this.sab, SabParam.AmpEnvAttack);
    const decay = getParam(this.sab, SabParam.AmpEnvDecay);
    const sustain = getParam(this.sab, SabParam.AmpEnvSustain);
    const release = getParam(this.sab, SabParam.AmpEnvRelease);

    this.voice.setParams(level, cutoff, resonance, drive, filterType, attack, decay, sustain, release);
  }
}
