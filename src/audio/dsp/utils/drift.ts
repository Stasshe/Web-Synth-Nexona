/**
 * Simple analog-style drift using filtered noise.
 * Produces slow random pitch deviation in cents.
 */
export class AnalogDrift {
  private value = 0;
  private target = 0;
  private timer = 0;
  private rate: number;
  private maxCents: number;

  constructor(sampleRate: number, maxCents = 0.3) {
    this.maxCents = maxCents;
    // Change direction roughly every 0.5-2 seconds
    this.rate = sampleRate * (0.5 + Math.random() * 1.5);
    this.target = (Math.random() * 2 - 1) * maxCents;
  }

  process(): number {
    this.timer++;
    if (this.timer >= this.rate) {
      this.timer = 0;
      this.target = (Math.random() * 2 - 1) * this.maxCents;
      this.rate = 24000 + Math.random() * 72000; // 0.5-2 sec at 48kHz
    }
    // One-pole low-pass to smooth the drift
    this.value += (this.target - this.value) * 0.00005;
    return this.value;
  }

  /** Returns frequency multiplier for the drift amount in cents */
  getFreqMultiplier(): number {
    return 2 ** (this.value / 1200);
  }
}
