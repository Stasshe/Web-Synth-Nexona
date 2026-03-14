/**
 * Comb model — delay-line comb filter with flanging modes.
 * Cutoff → comb period (1/cutoff seconds).
 * Blend → dry/wet amount.
 * Styles: 0=Comb Feedback, 1=Flange+, 2=Flange-
 */
import type { FilterModel, FilterProcessor } from "./filterTypes";
import { flushDenormal } from "../utils/denormal";

class CombFilter implements FilterProcessor {
  private buffer: Float32Array;
  private writePos = 0;
  private delaySamples = 0;
  private drive = 1;
  private blend = 0;
  private style = 0;
  private resonance = 0;
  private sampleRate: number;

  constructor(sampleRate: number) {
    this.sampleRate = sampleRate;
    this.buffer = new Float32Array(Math.ceil(sampleRate * 0.1) + 2);
  }

  setParams(
    cutoff: number,
    resonance: number,
    drive: number,
    blend: number,
    style: number,
    _sampleRate: number,
  ): void {
    const delaySec = 1 / Math.max(cutoff, 20);
    this.delaySamples = Math.min(delaySec * this.sampleRate, this.buffer.length - 2);
    this.resonance = resonance;
    this.drive = drive;
    this.blend = blend;
    this.style = style;
  }

  process(input: number): number {
    const x = this.drive > 1 ? Math.tanh(input * this.drive) / this.drive : input;

    const len = this.buffer.length;
    const delayInt = Math.floor(this.delaySamples);
    const frac = this.delaySamples - delayInt;
    const readA = (this.writePos - delayInt + len) % len;
    const readB = (readA - 1 + len) % len;
    const delayed = flushDenormal(this.buffer[readA] * (1 - frac) + this.buffer[readB] * frac);
    const fb = this.resonance * 0.97;

    let out: number;

    if (this.style === 0) {
      out = x + delayed * fb;
      this.buffer[this.writePos] = out;
    } else if (this.style === 1) {
      // Flange+ (positive)
      out = x * 0.5 + delayed * fb * 0.5;
      this.buffer[this.writePos] = x + delayed * fb;
    } else {
      // Flange- (negative, phase-inverted)
      out = x * 0.5 - delayed * fb * 0.5;
      this.buffer[this.writePos] = x - delayed * fb;
    }

    this.writePos = (this.writePos + 1) % len;

    const wet = (this.blend + 1) * 0.5;
    return x * (1 - wet) + out * wet;
  }

  reset(): void {
    this.buffer.fill(0);
    this.writePos = 0;
  }
}

export const COMB_MODEL: FilterModel = {
  id: "comb",
  name: "Comb",
  styleCount: 3,
  styleNames: ["Comb", "Flange +", "Flange −"],
  create: (sr) => new CombFilter(sr),
};
