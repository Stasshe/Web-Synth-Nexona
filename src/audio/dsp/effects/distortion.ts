/** Waveshaper distortion with multiple curve modes. */

type DistortionMode = 0 | 1 | 2 | 3; // soft, hard, fold, bitcrush

export class Distortion {
  private drive = 1;
  private tone = 0.5;
  private mix = 0;
  private mode: DistortionMode = 0;
  private bits = 8;

  setParams(drive: number, tone: number, mix: number, mode = 0): void {
    this.drive = drive;
    this.tone = tone;
    this.mix = mix;
    this.mode = mode as DistortionMode;
    this.bits = Math.round(4 + tone * 8); // 4-12 bits for bitcrush
  }

  private distort(x: number): number {
    const driven = x * this.drive;
    switch (this.mode) {
      case 0: // soft clip (tanh)
        return Math.tanh(driven);
      case 1: // hard clip
        return Math.max(-1, Math.min(1, driven));
      case 2: {
        // fold
        const folded = driven % 2;
        return folded > 1 ? 2 - folded : folded < -1 ? -2 - folded : folded;
      }
      case 3: {
        // bitcrush
        const step = 2 / 2 ** this.bits;
        return Math.round(driven / step) * step;
      }
    }
  }

  process(inL: number, inR: number): [number, number] {
    if (this.mix === 0) return [inL, inR];
    const dL = this.distort(inL);
    const dR = this.distort(inR);
    const m = this.mix;
    return [
      inL * (1 - m) + (dL / Math.max(1, this.drive)) * m,
      inR * (1 - m) + (dR / Math.max(1, this.drive)) * m,
    ];
  }
}
