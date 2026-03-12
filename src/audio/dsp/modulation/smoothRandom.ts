/**
 * Smooth random signal generator using cubic interpolation between random targets.
 * Produces a continuous, smooth random signal in [-1, 1].
 */
export class SmoothRandom {
  private phase = 0;
  private rate: number; // cycles per second
  private sampleRate: number;
  private blockSize: number;
  private prev = 0;
  private current = Math.random() * 2 - 1;
  private next = Math.random() * 2 - 1;
  private afterNext = Math.random() * 2 - 1;
  private value = 0;

  constructor(sampleRate: number, blockSize: number, rate = 2) {
    this.sampleRate = sampleRate;
    this.blockSize = blockSize;
    this.rate = rate;
  }

  setRate(rate: number): void {
    this.rate = rate;
  }

  process(): number {
    this.phase += (this.rate * this.blockSize) / this.sampleRate;
    while (this.phase >= 1.0) {
      this.phase -= 1.0;
      this.prev = this.current;
      this.current = this.next;
      this.next = this.afterNext;
      this.afterNext = Math.random() * 2 - 1;
    }

    // Cubic Hermite interpolation for smooth curves
    const t = this.phase;
    const a = this.prev;
    const b = this.current;
    const c = this.next;
    const d = this.afterNext;
    const t2 = t * t;
    const t3 = t2 * t;
    this.value =
      0.5 *
      (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);

    return Math.max(-1, Math.min(1, this.value));
  }

  getValue(): number {
    return this.value;
  }

  getPhase(): number {
    return this.phase;
  }
}
