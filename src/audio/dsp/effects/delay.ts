export class Delay {
  private bufferL: Float32Array;
  private bufferR: Float32Array;
  private writePos = 0;
  private sampleRate: number;
  private maxDelaySamples: number;

  private delaySamples = 0;
  private feedback = 0.3;
  private mix = 0;

  constructor(sampleRate: number) {
    this.sampleRate = sampleRate;
    // Max 2 seconds
    this.maxDelaySamples = sampleRate * 2;
    this.bufferL = new Float32Array(this.maxDelaySamples);
    this.bufferR = new Float32Array(this.maxDelaySamples);
    this.delaySamples = Math.floor(sampleRate * 0.375); // default 375ms
  }

  setParams(time: number, feedback: number, mix: number): void {
    this.delaySamples = Math.min(
      Math.floor(time * this.sampleRate),
      this.maxDelaySamples - 1,
    );
    this.feedback = Math.min(feedback, 0.95);
    this.mix = mix;
  }

  process(inL: number, inR: number): [number, number] {
    if (this.mix <= 0) return [inL, inR];

    const readPos =
      (this.writePos - this.delaySamples + this.maxDelaySamples) % this.maxDelaySamples;
    const delayedL = this.bufferL[readPos];
    const delayedR = this.bufferR[readPos];

    // tanh saturation on feedback to prevent runaway
    this.bufferL[this.writePos] = Math.tanh(inL + delayedL * this.feedback);
    this.bufferR[this.writePos] = Math.tanh(inR + delayedR * this.feedback);

    this.writePos = (this.writePos + 1) % this.maxDelaySamples;

    return [inL + delayedL * this.mix, inR + delayedR * this.mix];
  }
}
