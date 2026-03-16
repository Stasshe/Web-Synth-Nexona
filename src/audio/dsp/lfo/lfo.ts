export enum LfoShape {
  SINE = 0,
  TRIANGLE = 1,
  SQUARE = 2,
  RANDOM = 3,
  CUSTOM = 4,
}

export class LFO {
  private phase = 0;
  private rate = 1; // Hz
  private shape: LfoShape = LfoShape.SINE;
  private sampleRate: number;
  private blockSize: number;
  private value = 0;
  private randomTarget = 0;
  private randomValue = 0;
  private customTable: Float32Array | null = null;

  constructor(sampleRate: number, blockSize = 128) {
    this.sampleRate = sampleRate;
    this.blockSize = blockSize;
  }

  setParams(rate: number, shape: LfoShape): void {
    this.rate = rate;
    this.shape = shape;
  }

  setCustomTable(table: Float32Array): void {
    this.customTable = table;
  }

  /** Process at control rate (once per block). Returns [-1, 1]. */
  process(): number {
    this.phase += (this.rate * this.blockSize) / this.sampleRate;
    if (this.phase >= 1.0) {
      this.phase -= 1.0;
      if (this.shape === LfoShape.RANDOM) {
        this.randomTarget = Math.random() * 2 - 1;
      }
    }

    switch (this.shape) {
      case LfoShape.SINE:
        this.value = Math.sin(2 * Math.PI * this.phase);
        break;
      case LfoShape.TRIANGLE:
        if (this.phase < 0.25) this.value = this.phase * 4;
        else if (this.phase < 0.75) this.value = 2 - this.phase * 4;
        else this.value = this.phase * 4 - 4;
        break;
      case LfoShape.SQUARE:
        this.value = this.phase < 0.5 ? 1 : -1;
        break;
      case LfoShape.RANDOM:
        this.randomValue += (this.randomTarget - this.randomValue) * 0.1;
        this.value = this.randomValue;
        break;
      case LfoShape.CUSTOM:
        if (this.customTable && this.customTable.length > 1) {
          const len = this.customTable.length - 1; // table has len+1 entries, wrap-around at end
          const pos = this.phase * len;
          const i0 = Math.floor(pos) % len;
          const i1 = (i0 + 1) % len;
          const f = pos - Math.floor(pos);
          this.value = this.customTable[i0] + (this.customTable[i1] - this.customTable[i0]) * f;
        } else {
          this.value = Math.sin(2 * Math.PI * this.phase);
        }
        break;
    }

    return this.value;
  }

  getValue(): number {
    return this.value;
  }

  getPhase(): number {
    return this.phase;
  }

  reset(): void {
    this.phase = 0;
    this.value = 0;
    this.randomValue = 0;
    this.randomTarget = 0;
  }
}
