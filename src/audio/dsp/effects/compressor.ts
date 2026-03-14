/** Compressor with soft knee, linked stereo, and coefficient caching. */
export class Compressor {
  private threshold = -12;
  private ratio = 4;
  private attack = 0.01;
  private release = 0.1;
  private makeupGain = 1;
  private mix = 0;
  private kneeWidth = 6;

  private env = 0; // linked stereo envelope
  private gain = 1;
  private sampleRate: number;

  // Cached coefficients (computed once per setParams, not per sample)
  private attackCoeff = 0;
  private releaseCoeff = 0;

  constructor(sampleRate: number) {
    this.sampleRate = sampleRate;
    this.updateCoefficients();
  }

  private updateCoefficients(): void {
    this.attackCoeff = Math.exp(-1 / (this.attack * this.sampleRate));
    this.releaseCoeff = Math.exp(-1 / (this.release * this.sampleRate));
  }

  setParams(
    threshold: number,
    ratio: number,
    attack: number,
    release: number,
    makeupGain: number,
    mix: number,
    knee: number,
  ): void {
    this.threshold = threshold;
    this.ratio = Math.max(1, ratio);
    this.kneeWidth = Math.max(0, knee);
    if (this.attack !== attack || this.release !== release) {
      this.attack = attack;
      this.release = release;
      this.updateCoefficients();
    }
    this.makeupGain = makeupGain;
    this.mix = mix;
  }

  /** Gain reduction in dB (positive = reducing gain). */
  getGainReductionDb(): number {
    return this.gain < 1 ? -20 * Math.log10(Math.max(this.gain, 1e-6)) : 0;
  }

  private computeGain(inputDb: number): number {
    const t = this.threshold;
    const r = this.ratio;
    const k = this.kneeWidth;

    if (k < 0.1) {
      // Hard knee
      if (inputDb <= t) return 1;
      const excess = inputDb - t;
      return 10 ** (-(excess * (1 - 1 / r)) / 20);
    }

    const halfKnee = k * 0.5;

    if (inputDb <= t - halfKnee) {
      // Below knee — no compression
      return 1;
    }

    let reductionDb: number;
    if (inputDb >= t + halfKnee) {
      // Above knee — full compression
      const excess = inputDb - t;
      reductionDb = excess * (1 - 1 / r);
    } else {
      // In the knee region — soft transition
      const x = inputDb - t + halfKnee;
      reductionDb = ((1 - 1 / r) * x * x) / (2 * k);
    }

    return 10 ** (-reductionDb / 20);
  }

  process(inL: number, inR: number): [number, number] {
    if (this.mix === 0) return [inL, inR];

    // Linked stereo: use max of L/R for envelope
    const peak = Math.max(Math.abs(inL), Math.abs(inR));
    const sq = peak * peak;

    // Envelope follower
    const coeff = sq > this.env ? this.attackCoeff : this.releaseCoeff;
    this.env = sq * (1 - coeff) + this.env * coeff;

    // Convert to dB
    const rms = Math.sqrt(Math.max(this.env, 1e-10));
    const inputDb = 20 * Math.log10(rms);

    // Compute target gain with soft knee
    const targetGain = this.computeGain(inputDb);

    // Smooth gain changes
    const gainCoeff = targetGain < this.gain ? 1 - this.attackCoeff : 1 - this.releaseCoeff;
    this.gain += (targetGain - this.gain) * gainCoeff;

    const outL = inL * this.gain * this.makeupGain;
    const outR = inR * this.gain * this.makeupGain;

    const m = this.mix;
    return [inL * (1 - m) + outL * m, inR * (1 - m) + outR * m];
  }
}
