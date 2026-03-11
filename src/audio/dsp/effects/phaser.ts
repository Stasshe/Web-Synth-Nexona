/** 6-stage all-pass phaser with stereo LFO modulation. */
const STAGES = 6;

class AllPassStage {
  private s = 0;
  process(x: number, g: number): number {
    const y = -g * x + this.s;
    this.s = g * y + x;
    return y;
  }
}

export class Phaser {
  private stagesL: AllPassStage[];
  private stagesR: AllPassStage[];
  private lfoPhase = 0;
  private rate = 0.5;
  private depth = 0.7;
  private feedback = 0.5;
  private mix = 0;
  private fbL = 0;
  private fbR = 0;
  private sampleRate: number;

  constructor(sampleRate: number) {
    this.sampleRate = sampleRate;
    this.stagesL = Array.from({ length: STAGES }, () => new AllPassStage());
    this.stagesR = Array.from({ length: STAGES }, () => new AllPassStage());
  }

  setParams(rate: number, depth: number, feedback: number, mix: number): void {
    this.rate = rate;
    this.depth = depth;
    this.feedback = feedback * 0.9;
    this.mix = mix;
  }

  private processChain(stages: AllPassStage[], input: number, modFreq: number): number {
    // All-pass coefficient swept by LFO
    const g = Math.tan(Math.PI * modFreq / this.sampleRate);
    const coeff = (g - 1) / (g + 1);
    let y = input;
    for (const stage of stages) {
      y = stage.process(y, coeff);
    }
    return y;
  }

  process(inL: number, inR: number): [number, number] {
    if (this.mix === 0) return [inL, inR];
    const lfoL = 0.5 + 0.5 * Math.sin(2 * Math.PI * this.lfoPhase);
    const lfoR = 0.5 + 0.5 * Math.sin(2 * Math.PI * this.lfoPhase + Math.PI * 0.5);
    this.lfoPhase = (this.lfoPhase + this.rate / this.sampleRate) % 1;

    const minFreq = 200;
    const maxFreq = 4000;
    const freqL = minFreq * (maxFreq / minFreq) ** (lfoL * this.depth);
    const freqR = minFreq * (maxFreq / minFreq) ** (lfoR * this.depth);

    const apL = this.processChain(this.stagesL, inL + this.fbL * this.feedback, freqL);
    const apR = this.processChain(this.stagesR, inR + this.fbR * this.feedback, freqR);
    this.fbL = apL;
    this.fbR = apR;

    const m = this.mix;
    return [inL * (1 - m) + apL * m, inR * (1 - m) + apR * m];
  }
}
