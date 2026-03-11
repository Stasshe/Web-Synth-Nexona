/**
 * Lookahead limiter with attack/release envelope following.
 */
export class Limiter {
  private lookaheadBuffer: Float32Array[];
  private lookaheadSize: number;
  private writePos = 0;
  private envelope = 0;
  private threshold = 0.95;
  private attackCoeff: number;
  private releaseCoeff: number;

  constructor(sampleRate: number) {
    // 5ms lookahead
    this.lookaheadSize = Math.ceil(sampleRate * 0.005);
    this.lookaheadBuffer = [
      new Float32Array(this.lookaheadSize),
      new Float32Array(this.lookaheadSize),
    ];
    // Fast attack (~1ms), slow release (~50ms)
    this.attackCoeff = Math.exp(-1 / (sampleRate * 0.001));
    this.releaseCoeff = Math.exp(-1 / (sampleRate * 0.05));
  }

  process(inL: number, inR: number): [number, number] {
    // Write current input to lookahead buffer
    this.lookaheadBuffer[0][this.writePos] = inL;
    this.lookaheadBuffer[1][this.writePos] = inR;

    // Read delayed output
    const readPos = (this.writePos + 1) % this.lookaheadSize;
    const delayedL = this.lookaheadBuffer[0][readPos];
    const delayedR = this.lookaheadBuffer[1][readPos];

    this.writePos = (this.writePos + 1) % this.lookaheadSize;

    // Peak detection on current input
    const peak = Math.max(Math.abs(inL), Math.abs(inR));

    // Envelope follower
    if (peak > this.envelope) {
      this.envelope = this.attackCoeff * this.envelope + (1 - this.attackCoeff) * peak;
    } else {
      this.envelope = this.releaseCoeff * this.envelope + (1 - this.releaseCoeff) * peak;
    }

    // Compute gain reduction
    let gain = 1;
    if (this.envelope > this.threshold) {
      gain = this.threshold / this.envelope;
    }

    return [delayedL * gain, delayedR * gain];
  }
}
