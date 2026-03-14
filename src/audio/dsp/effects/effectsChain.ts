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
  compKnee: number;

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

interface Effect {
  process(inL: number, inR: number): [number, number];
}

export const EFFECT_COUNT = 8;
export const EFFECT_NAMES = [
  "distortion",
  "compressor",
  "chorus",
  "flanger",
  "phaser",
  "delay",
  "reverb",
  "eq",
] as const;

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

  private effects: Effect[];
  private order: number[] = [0, 1, 2, 3, 4, 5, 6, 7];

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

    this.effects = [
      this.distortion,
      this.compressor,
      this.chorus,
      this.flanger,
      this.phaser,
      this.delay,
      this.reverb,
      this.eq,
    ];
  }

  setOrder(order: number[]): void {
    if (order.length === EFFECT_COUNT) {
      this.order = order;
    }
  }

  getCompGR(): number {
    return this.compressor.getGainReductionDb();
  }

  setParams(p: EffectsParams): void {
    this.distortion.setParams(
      p.distortionDrive,
      p.distortionTone,
      p.distortionMix,
      p.distortionMode,
    );
    this.compressor.setParams(
      p.compThreshold,
      p.compRatio,
      p.compAttack,
      p.compRelease,
      10 ** (p.compMakeup / 20),
      p.compMix,
      p.compKnee,
    );
    this.chorus.setParams(p.chorusRate, p.chorusDepth, p.chorusMix);
    this.flanger.setParams(p.flangerRate, p.flangerDepth, p.flangerFeedback, p.flangerMix);
    this.phaser.setParams(p.phaserRate, p.phaserDepth, p.phaserFeedback, p.phaserMix);
    this.delay.setParams(p.delayTime, p.delayFeedback, p.delayMix);
    this.reverb.setParams(p.reverbDecay, p.reverbMix);
    this.eq.setParams(p.eqLowGain, p.eqMidGain, p.eqHighGain, p.eqMix);
  }

  process(inL: number, inR: number): [number, number] {
    let l = inL;
    let r = inR;

    for (let i = 0; i < this.order.length; i++) {
      const idx = this.order[i];
      if (idx >= 0 && idx < this.effects.length) {
        [l, r] = this.effects[idx].process(l, r);
      }
    }

    [l, r] = this.limiter.process(l, r);
    return [l, r];
  }
}
