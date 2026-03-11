import { flushDenormal } from "../utils/denormal";

export const enum EnvelopeState {
  IDLE,
  ATTACK,
  DECAY,
  SUSTAIN,
  RELEASE,
}

export class ADSREnvelope {
  state = EnvelopeState.IDLE;
  private level = 0;
  private attackRate = 0;
  private decayRate = 0;
  private sustainLevel = 1;
  private releaseRate = 0;
  private sampleRate: number;

  constructor(sampleRate: number) {
    this.sampleRate = sampleRate;
  }

  setParams(attack: number, decay: number, sustain: number, release: number): void {
    this.attackRate = attack > 0.001 ? 1 / (attack * this.sampleRate) : 1;
    this.decayRate = decay > 0.001 ? 1 / (decay * this.sampleRate) : 1;
    this.sustainLevel = sustain;
    this.releaseRate = release > 0.001 ? 1 / (release * this.sampleRate) : 1;
  }

  gate(): void {
    this.state = EnvelopeState.ATTACK;
  }

  release(): void {
    if (this.state !== EnvelopeState.IDLE) {
      this.state = EnvelopeState.RELEASE;
    }
  }

  process(): number {
    switch (this.state) {
      case EnvelopeState.ATTACK:
        this.level += this.attackRate;
        if (this.level >= 1) {
          this.level = 1;
          this.state = EnvelopeState.DECAY;
        }
        break;

      case EnvelopeState.DECAY:
        this.level -= (this.level - this.sustainLevel) * this.decayRate;
        if (this.level <= this.sustainLevel + 0.0001) {
          this.level = this.sustainLevel;
          this.state = EnvelopeState.SUSTAIN;
        }
        break;

      case EnvelopeState.SUSTAIN:
        this.level = this.sustainLevel;
        break;

      case EnvelopeState.RELEASE:
        this.level -= this.level * this.releaseRate;
        this.level = flushDenormal(this.level);
        if (this.level <= 0.0001) {
          this.level = 0;
          this.state = EnvelopeState.IDLE;
        }
        break;

      case EnvelopeState.IDLE:
        this.level = 0;
        break;
    }

    return this.level;
  }

  isIdle(): boolean {
    return this.state === EnvelopeState.IDLE;
  }

  getLevel(): number {
    return this.level;
  }
}
