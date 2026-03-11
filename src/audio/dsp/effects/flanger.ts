/** Stereo flanger: short delay modulated by LFO with feedback. */
const MAX_DELAY = 0.02; // 20ms max

export class Flanger {
  private bufL: Float32Array;
  private bufR: Float32Array;
  private writePos = 0;
  private lfoPhase = 0;
  private rate = 0.5;
  private depth = 0.005;
  private feedback = 0.5;
  private mix = 0;
  private sampleRate: number;

  constructor(sampleRate: number) {
    this.sampleRate = sampleRate;
    const maxSamples = Math.ceil(sampleRate * MAX_DELAY) + 2;
    this.bufL = new Float32Array(maxSamples);
    this.bufR = new Float32Array(maxSamples);
  }

  setParams(rate: number, depth: number, feedback: number, mix: number): void {
    this.rate = rate;
    this.depth = depth * MAX_DELAY;
    this.feedback = feedback * 0.9;
    this.mix = mix;
  }

  private readInterp(buf: Float32Array, delay: number): number {
    const len = buf.length;
    const pos = (this.writePos - delay + len * 2) % len;
    const i = Math.floor(pos);
    const frac = pos - i;
    const a = buf[i % len];
    const b = buf[(i + 1) % len];
    return a + (b - a) * frac;
  }

  process(inL: number, inR: number): [number, number] {
    if (this.mix === 0) return [inL, inR];
    // LFO  (stereo offset of π/2)
    const lfoL = 0.5 + 0.5 * Math.sin(2 * Math.PI * this.lfoPhase);
    const lfoR = 0.5 + 0.5 * Math.sin(2 * Math.PI * this.lfoPhase + Math.PI * 0.5);
    this.lfoPhase = (this.lfoPhase + this.rate / this.sampleRate) % 1;

    const delaySamplesL = (0.001 + lfoL * this.depth) * this.sampleRate;
    const delaySamplesR = (0.001 + lfoR * this.depth) * this.sampleRate;

    const delayedL = this.readInterp(this.bufL, delaySamplesL);
    const delayedR = this.readInterp(this.bufR, delaySamplesR);

    this.bufL[this.writePos] = inL + delayedL * this.feedback;
    this.bufR[this.writePos] = inR + delayedR * this.feedback;
    this.writePos = (this.writePos + 1) % this.bufL.length;

    const m = this.mix;
    return [inL * (1 - m) + (inL + delayedL) * 0.5 * m,
            inR * (1 - m) + (inR + delayedR) * 0.5 * m];
  }
}
