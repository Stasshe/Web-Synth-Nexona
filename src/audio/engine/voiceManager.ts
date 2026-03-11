import { EnvelopeState } from "../dsp/envelope/adsr";
import { type ModRoute, ModSource } from "../dsp/modulation/modMatrix";
import type { Wavetable } from "../dsp/wavetable/wavetableEngine";
import { Voice, type VoiceParams } from "./voice";

const MAX_VOICES = 16;

export class VoiceManager {
  private voices: Voice[] = [];
  private sampleRate: number;
  private wavetableA: Wavetable | null = null;
  private wavetableB: Wavetable | null = null;
  private wavetableC: Wavetable | null = null;
  private wavetableSub: Wavetable | null = null;

  constructor(sampleRate: number) {
    this.sampleRate = sampleRate;
    for (let i = 0; i < MAX_VOICES; i++) {
      this.voices.push(new Voice(sampleRate));
    }
  }

  setWavetableA(wt: Wavetable): void {
    this.wavetableA = wt;
    for (const v of this.voices) v.setWavetableA(wt);
  }

  setWavetableB(wt: Wavetable): void {
    this.wavetableB = wt;
    for (const v of this.voices) v.setWavetableB(wt);
  }

  setWavetableC(wt: Wavetable): void {
    this.wavetableC = wt;
    for (const v of this.voices) v.setWavetableC(wt);
  }

  setWavetableSub(wt: Wavetable): void {
    this.wavetableSub = wt;
    for (const v of this.voices) v.setWavetableSub(wt);
  }

  setModRoutes(routes: ModRoute[]): void {
    for (const v of this.voices) {
      v.modMatrix.setRoutes(routes);
    }
  }

  noteOn(note: number, velocity: number): void {
    // Check if same note is already playing
    for (const v of this.voices) {
      if (v.getNote() === note && !v.isIdle()) {
        v.noteOn(note, velocity);
        return;
      }
    }

    // Find idle voice
    let voice = this.voices.find((v) => v.isIdle());

    if (!voice) {
      // Voice stealing: find voice in RELEASE state (quietest)
      let stealCandidate: Voice | null = null;
      for (const v of this.voices) {
        if (v.ampEnvelope.state === EnvelopeState.RELEASE) {
          if (!stealCandidate || v.ampEnvelope.getLevel() < stealCandidate.ampEnvelope.getLevel()) {
            stealCandidate = v;
          }
        }
      }

      if (!stealCandidate) {
        // Steal oldest active voice (first in array)
        stealCandidate = this.voices[0];
      }

      stealCandidate.startFadeOut();
      voice = stealCandidate;
    }

    if (this.wavetableA) voice.setWavetableA(this.wavetableA);
    if (this.wavetableB) voice.setWavetableB(this.wavetableB);
    if (this.wavetableC) voice.setWavetableC(this.wavetableC);
    if (this.wavetableSub) voice.setWavetableSub(this.wavetableSub);
    voice.noteOn(note, velocity);
  }

  noteOff(note: number): void {
    for (const v of this.voices) {
      if (v.getNote() === note && !v.isIdle()) {
        v.noteOff();
      }
    }
  }

  setParams(p: VoiceParams): void {
    for (const v of this.voices) {
      if (!v.isIdle()) {
        v.setParams(p);
      }
    }
  }

  setLfoValues(lfo1: number, lfo2: number, macros: number[]): void {
    for (const v of this.voices) {
      if (!v.isIdle()) {
        v.modMatrix.setSourceValue(ModSource.LFO1, lfo1);
        v.modMatrix.setSourceValue(ModSource.LFO2, lfo2);
        v.modMatrix.setSourceValue(ModSource.MACRO1, macros[0] ?? 0);
        v.modMatrix.setSourceValue(ModSource.MACRO2, macros[1] ?? 0);
        v.modMatrix.setSourceValue(ModSource.MACRO3, macros[2] ?? 0);
        v.modMatrix.setSourceValue(ModSource.MACRO4, macros[3] ?? 0);
      }
    }
  }

  /** Process one sample, returns mixed [left, right]. */
  processSample(): [number, number] {
    let sumL = 0;
    let sumR = 0;
    for (const v of this.voices) {
      if (!v.isIdle()) {
        const [l, r] = v.processSample();
        sumL += l;
        sumR += r;
      }
    }
    return [sumL, sumR];
  }
}
