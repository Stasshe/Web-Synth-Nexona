export class Chorus {
  private delayBufferL: Float32Array;
  private delayBufferR: Float32Array;
  private writePos = 0;
  private lfoPhase = 0;
  private sampleRate: number;
  private bufferSize: number;

  private rate = 0.5;
  private depth = 0.3;
  private mix = 0;

  constructor(sampleRate: number) {
    this.sampleRate = sampleRate;
    // Max delay ~30ms
    this.bufferSize = Math.ceil(sampleRate * 0.03);
    this.delayBufferL = new Float32Array(this.bufferSize);
    this.delayBufferR = new Float32Array(this.bufferSize);
  }

  setParams(rate: number, depth: number, mix: number): void {
    this.rate = rate;
    this.depth = depth;
    this.mix = mix;
  }

  process(inL: number, inR: number): [number, number] {
    if (this.mix <= 0) return [inL, inR];

    this.delayBufferL[this.writePos] = inL;
    this.delayBufferR[this.writePos] = inR;

    // Two LFO phases offset by 90 degrees for stereo
    const mod1 = Math.sin(2 * Math.PI * this.lfoPhase);
    const mod2 = Math.sin(2 * Math.PI * this.lfoPhase + Math.PI * 0.5);

    // Delay time 5-25ms modulated by LFO
    const baseDelay = this.sampleRate * 0.015;
    const modRange = this.sampleRate * 0.01 * this.depth;

    const delayL = baseDelay + mod1 * modRange;
    const delayR = baseDelay + mod2 * modRange;

    // Fractional delay read with linear interpolation
    const outL = this.readDelay(this.delayBufferL, delayL);
    const outR = this.readDelay(this.delayBufferR, delayR);

    this.lfoPhase += this.rate / this.sampleRate;
    if (this.lfoPhase >= 1.0) this.lfoPhase -= 1.0;

    this.writePos = (this.writePos + 1) % this.bufferSize;

    return [inL + (outL - inL) * this.mix, inR + (outR - inR) * this.mix];
  }

  private readDelay(buffer: Float32Array, delaySamples: number): number {
    const readPos = this.writePos - delaySamples;
    const idx = readPos < 0 ? readPos + this.bufferSize : readPos;
    const i0 = Math.floor(idx) % this.bufferSize;
    const i1 = (i0 + 1) % this.bufferSize;
    const frac = idx - Math.floor(idx);
    return buffer[i0] * (1 - frac) + buffer[i1] * frac;
  }
}
