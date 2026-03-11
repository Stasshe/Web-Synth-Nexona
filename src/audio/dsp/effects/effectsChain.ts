import { Chorus } from "./chorus";
import { Compressor } from "./compressor";
import { Delay } from "./delay";
import { Distortion } from "./distortion";
import { EQ } from "./eq";
import { Flanger } from "./flanger";
import { Limiter } from "./limiter";
import { Phaser } from "./phaser";
import { Reverb } from "./reverb";

export interface EffectsParams {
  distortionDrive: number;
  distortionTone: number;
  distortionMix: number;
  distortionMode: number;

  compThreshold: number;
  compRatio: number;
  compAttack: number;
  compRelease: number;
  compMakeup: number;
  compMix: number;

  chorusRate: number;
  chorusDepth: number;
  chorusMix: number;

  flangerRate: number;
  flangerDepth: number;
  flangerFeedback: number;
  flangerMix: number;

  phaserRate: number;
  phaserDepth: number;
  phaserFeedback: number;
  phaserMix: number;

  delayTime: number;
  delayFeedback: number;
  delayMix: number;

  reverbDecay: number;
  reverbMix: number;

  eqLowGain: number;
  eqMidGain: number;
  eqHighGain: number;
  eqMix: number;
}

export class EffectsChain {
  private distortion: Distortion;
  private compressor: Compressor;
  private chorus: Chorus;
  private flanger: Flanger;
  private phaser: Phaser;
  private delay: Delay;
  private reverb: Reverb;
  private eq: EQ;
  private limiter: Limiter;

  constructor(sampleRate: number) {
    this.distortion = new Distortion();
    this.compressor = new Compressor(sampleRate);
    this.chorus = new Chorus(sampleRate);
    this.flanger = new Flanger(sampleRate);
    this.phaser = new Phaser(sampleRate);
    this.delay = new Delay(sampleRate);
    this.reverb = new Reverb(sampleRate);
    this.eq = new EQ(sampleRate);
    this.limiter = new Limiter(sampleRate);
  }

  setParams(p: EffectsParams): void {
    this.distortion.setParams(p.distortionDrive, p.distortionTone, p.distortionMix, p.distortionMode);
    this.compressor.setParams(p.compThreshold, p.compRatio, p.compAttack, p.compRelease, 10 ** (p.compMakeup / 20), p.compMix);
    this.chorus.setParams(p.chorusRate, p.chorusDepth, p.chorusMix);
    this.flanger.setParams(p.flangerRate, p.flangerDepth, p.flangerFeedback, p.flangerMix);
    this.phaser.setParams(p.phaserRate, p.phaserDepth, p.phaserFeedback, p.phaserMix);
    this.delay.setParams(p.delayTime, p.delayFeedback, p.delayMix);
    this.reverb.setParams(p.reverbDecay, p.reverbMix);
    this.eq.setParams(p.eqLowGain, p.eqMidGain, p.eqHighGain, p.eqMix);
  }

  process(inL: number, inR: number): [number, number] {
    let [l, r] = this.distortion.process(inL, inR);
    [l, r] = this.compressor.process(l, r);
    [l, r] = this.chorus.process(l, r);
    [l, r] = this.flanger.process(l, r);
    [l, r] = this.phaser.process(l, r);
    [l, r] = this.delay.process(l, r);
    [l, r] = this.reverb.process(l, r);
    [l, r] = this.eq.process(l, r);
    [l, r] = this.limiter.process(l, r);
    return [l, r];
  }
}
