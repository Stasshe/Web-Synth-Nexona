/**
 * Freeverb-style reverb: 4 comb filters + 2 allpass filters per channel.
 */

class CombFilter {
  private buffer: Float32Array;
  private pos = 0;
  private filterState = 0;
  feedback = 0.7;
  damp = 0.5;

  constructor(size: number) {
    this.buffer = new Float32Array(size);
  }

  process(input: number): number {
    const output = this.buffer[this.pos];
    this.filterState = output * (1 - this.damp) + this.filterState * this.damp;
    this.buffer[this.pos] = input + this.filterState * this.feedback;
    this.pos = (this.pos + 1) % this.buffer.length;
    return output;
  }
}

class AllpassFilter {
  private buffer: Float32Array;
  private pos = 0;

  constructor(size: number) {
    this.buffer = new Float32Array(size);
  }

  process(input: number): number {
    const buf = this.buffer[this.pos];
    const output = buf - input;
    this.buffer[this.pos] = input + buf * 0.5;
    this.pos = (this.pos + 1) % this.buffer.length;
    return output;
  }
}

// Freeverb tuning constants (at 44100Hz, scaled to actual sample rate)
const COMB_SIZES = [1116, 1188, 1277, 1356];
const ALLPASS_SIZES = [556, 441];
const STEREO_SPREAD = 23;

export class Reverb {
  private combsL: CombFilter[];
  private combsR: CombFilter[];
  private allpassL: AllpassFilter[];
  private allpassR: AllpassFilter[];

  private decay = 0.7;
  private mix = 0;

  constructor(sampleRate: number) {
    const scale = sampleRate / 44100;

    this.combsL = COMB_SIZES.map((s) => new CombFilter(Math.floor(s * scale)));
    this.combsR = COMB_SIZES.map(
      (s) => new CombFilter(Math.floor((s + STEREO_SPREAD) * scale)),
    );
    this.allpassL = ALLPASS_SIZES.map((s) => new AllpassFilter(Math.floor(s * scale)));
    this.allpassR = ALLPASS_SIZES.map(
      (s) => new AllpassFilter(Math.floor((s + STEREO_SPREAD) * scale)),
    );
  }

  setParams(decay: number, mix: number): void {
    this.decay = decay;
    this.mix = mix;
    for (const c of this.combsL) c.feedback = decay;
    for (const c of this.combsR) c.feedback = decay;
  }

  process(inL: number, inR: number): [number, number] {
    if (this.mix <= 0) return [inL, inR];

    const mono = (inL + inR) * 0.5;

    let outL = 0;
    let outR = 0;
    for (const c of this.combsL) outL += c.process(mono);
    for (const c of this.combsR) outR += c.process(mono);

    for (const a of this.allpassL) outL = a.process(outL);
    for (const a of this.allpassR) outR = a.process(outR);

    return [inL + outL * this.mix, inR + outR * this.mix];
  }
}
