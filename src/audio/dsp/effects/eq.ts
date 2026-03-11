/** 3-band parametric EQ using biquad filters (low shelf, peak, high shelf). */

class BiquadFilter {
  private b0 = 1;
  private b1 = 0;
  private b2 = 0;
  private a1 = 0;
  private a2 = 0;
  private x1 = 0;
  private x2 = 0;
  private y1 = 0;
  private y2 = 0;

  /** Low shelf. */
  setLowShelf(freq: number, gainDb: number, sr: number): void {
    const A = 10 ** (gainDb / 40);
    const w0 = (2 * Math.PI * freq) / sr;
    const cosw = Math.cos(w0);
    const sinw = Math.sin(w0);
    const S = 1; // shelf slope
    const alpha = (sinw / 2) * Math.sqrt((A + 1 / A) * (1 / S - 1) + 2);
    const b0 = A * (A + 1 - (A - 1) * cosw + 2 * Math.sqrt(A) * alpha);
    const b1 = 2 * A * (A - 1 - (A + 1) * cosw);
    const b2 = A * (A + 1 - (A - 1) * cosw - 2 * Math.sqrt(A) * alpha);
    const a0 = A + 1 + (A - 1) * cosw + 2 * Math.sqrt(A) * alpha;
    const a1 = -2 * (A - 1 + (A + 1) * cosw);
    const a2 = A + 1 + (A - 1) * cosw - 2 * Math.sqrt(A) * alpha;
    this.b0 = b0 / a0;
    this.b1 = b1 / a0;
    this.b2 = b2 / a0;
    this.a1 = a1 / a0;
    this.a2 = a2 / a0;
  }

  /** Peaking EQ. */
  setPeaking(freq: number, gainDb: number, Q: number, sr: number): void {
    const A = 10 ** (gainDb / 40);
    const w0 = (2 * Math.PI * freq) / sr;
    const cosw = Math.cos(w0);
    const alpha = Math.sin(w0) / (2 * Q);
    const b0 = 1 + alpha * A;
    const b1 = -2 * cosw;
    const b2 = 1 - alpha * A;
    const a0 = 1 + alpha / A;
    const a1 = -2 * cosw;
    const a2 = 1 - alpha / A;
    this.b0 = b0 / a0;
    this.b1 = b1 / a0;
    this.b2 = b2 / a0;
    this.a1 = a1 / a0;
    this.a2 = a2 / a0;
  }

  /** High shelf. */
  setHighShelf(freq: number, gainDb: number, sr: number): void {
    const A = 10 ** (gainDb / 40);
    const w0 = (2 * Math.PI * freq) / sr;
    const cosw = Math.cos(w0);
    const sinw = Math.sin(w0);
    const alpha = (sinw / 2) * Math.sqrt((A + 1 / A) * (1 / 1 - 1) + 2);
    const b0 = A * (A + 1 + (A - 1) * cosw + 2 * Math.sqrt(A) * alpha);
    const b1 = -2 * A * (A - 1 + (A + 1) * cosw);
    const b2 = A * (A + 1 + (A - 1) * cosw - 2 * Math.sqrt(A) * alpha);
    const a0 = A + 1 - (A - 1) * cosw + 2 * Math.sqrt(A) * alpha;
    const a1 = 2 * (A - 1 - (A + 1) * cosw);
    const a2 = A + 1 - (A - 1) * cosw - 2 * Math.sqrt(A) * alpha;
    this.b0 = b0 / a0;
    this.b1 = b1 / a0;
    this.b2 = b2 / a0;
    this.a1 = a1 / a0;
    this.a2 = a2 / a0;
  }

  process(x: number): number {
    const y =
      this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1;
    this.x1 = x;
    this.y2 = this.y1;
    this.y1 = isFinite(y) ? y : 0;
    return this.y1;
  }
}

export class EQ {
  private lowL = new BiquadFilter();
  private lowR = new BiquadFilter();
  private midL = new BiquadFilter();
  private midR = new BiquadFilter();
  private highL = new BiquadFilter();
  private highR = new BiquadFilter();
  private lowGain = 0;
  private midGain = 0;
  private highGain = 0;
  private mix = 0;
  private sampleRate: number;

  constructor(sampleRate: number) {
    this.sampleRate = sampleRate;
  }

  setParams(lowGain: number, midGain: number, highGain: number, mix: number): void {
    const sr = this.sampleRate;
    if (lowGain !== this.lowGain || midGain !== this.midGain || highGain !== this.highGain) {
      this.lowGain = lowGain;
      this.midGain = midGain;
      this.highGain = highGain;
      this.lowL.setLowShelf(250, lowGain, sr);
      this.lowR.setLowShelf(250, lowGain, sr);
      this.midL.setPeaking(1000, midGain, 1, sr);
      this.midR.setPeaking(1000, midGain, 1, sr);
      this.highL.setHighShelf(4000, highGain, sr);
      this.highR.setHighShelf(4000, highGain, sr);
    }
    this.mix = mix;
  }

  process(inL: number, inR: number): [number, number] {
    if (this.mix === 0) return [inL, inR];
    const eqL = this.highL.process(this.midL.process(this.lowL.process(inL)));
    const eqR = this.highR.process(this.midR.process(this.lowR.process(inR)));
    const m = this.mix;
    return [inL * (1 - m) + eqL * m, inR * (1 - m) + eqR * m];
  }
}
