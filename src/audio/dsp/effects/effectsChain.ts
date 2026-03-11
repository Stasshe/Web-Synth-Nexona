import { Chorus } from "./chorus";
import { Delay } from "./delay";
import { Limiter } from "./limiter";
import { Reverb } from "./reverb";

export interface EffectsParams {
  chorusRate: number;
  chorusDepth: number;
  chorusMix: number;

  delayTime: number;
  delayFeedback: number;
  delayMix: number;

  reverbDecay: number;
  reverbMix: number;
}

export class EffectsChain {
  private chorus: Chorus;
  private delay: Delay;
  private reverb: Reverb;
  private limiter: Limiter;

  constructor(sampleRate: number) {
    this.chorus = new Chorus(sampleRate);
    this.delay = new Delay(sampleRate);
    this.reverb = new Reverb(sampleRate);
    this.limiter = new Limiter(sampleRate);
  }

  setParams(p: EffectsParams): void {
    this.chorus.setParams(p.chorusRate, p.chorusDepth, p.chorusMix);
    this.delay.setParams(p.delayTime, p.delayFeedback, p.delayMix);
    this.reverb.setParams(p.reverbDecay, p.reverbMix);
  }

  process(inL: number, inR: number): [number, number] {
    let [l, r] = this.chorus.process(inL, inR);
    [l, r] = this.delay.process(l, r);
    [l, r] = this.reverb.process(l, r);
    [l, r] = this.limiter.process(l, r);
    return [l, r];
  }
}
