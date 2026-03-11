/** Simple RMS compressor with lookahead-free design. */
export class Compressor {
  private threshold = -12; // dBFS
  private ratio = 4;
  private attack = 0.01;
  private release = 0.1;
  private makeupGain = 1;
  private mix = 0;

  private envL = 0;
  private envR = 0;
  private gainL = 1;
  private gainR = 1;
  private sampleRate: number;

  constructor(sampleRate: number) {
    this.sampleRate = sampleRate;
  }

  setParams(
    threshold: number,
    ratio: number,
    attack: number,
    release: number,
    makeupGain: number,
    mix: number,
  ): void {
    this.threshold = threshold;
    this.ratio = Math.max(1, ratio);
    this.attack = attack;
    this.release = release;
    this.makeupGain = makeupGain;
    this.mix = mix;
  }

  private computeGain(rmsDb: number): number {
    if (rmsDb <= this.threshold) return 1;
    const excess = rmsDb - this.threshold;
    const reduction = excess * (1 - 1 / this.ratio);
    return 10 ** (-reduction / 20);
  }

  private processChannel(input: number, env: number, gain: number): [number, number, number] {
    const sr = this.sampleRate;
    // RMS envelope
    const sq = input * input;
    const attackCoeff = Math.exp(-1 / (this.attack * sr));
    const releaseCoeff = Math.exp(-1 / (this.release * sr));
    const newEnv =
      sq > env
        ? sq * (1 - attackCoeff) + env * attackCoeff
        : sq * (1 - releaseCoeff) + env * releaseCoeff;
    const rms = Math.sqrt(Math.max(newEnv, 1e-10));
    const rmsDb = 20 * Math.log10(rms);
    const targetGain = this.computeGain(rmsDb);
    // Smooth gain changes
    const coeff = targetGain < gain ? 1 - attackCoeff : 1 - releaseCoeff;
    const newGain = gain + (targetGain - gain) * coeff;
    return [input * newGain * this.makeupGain, newEnv, newGain];
  }

  process(inL: number, inR: number): [number, number] {
    if (this.mix === 0) return [inL, inR];
    const [outL, envL, gainL] = this.processChannel(inL, this.envL, this.gainL);
    const [outR, envR, gainR] = this.processChannel(inR, this.envR, this.gainR);
    this.envL = envL;
    this.gainL = gainL;
    this.envR = envR;
    this.gainR = gainR;
    const m = this.mix;
    return [inL * (1 - m) + outL * m, inR * (1 - m) + outR * m];
  }
}
