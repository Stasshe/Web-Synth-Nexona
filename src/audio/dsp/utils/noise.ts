export class WhiteNoise {
  process(): number {
    return Math.random() * 2 - 1;
  }
}

/**
 * Pink noise using Paul Kellet's algorithm
 */
export class PinkNoise {
  private b0 = 0;
  private b1 = 0;
  private b2 = 0;
  private b3 = 0;
  private b4 = 0;
  private b5 = 0;
  private b6 = 0;

  process(): number {
    const white = Math.random() * 2 - 1;
    this.b0 = 0.99886 * this.b0 + white * 0.0555179;
    this.b1 = 0.99332 * this.b1 + white * 0.0750759;
    this.b2 = 0.969 * this.b2 + white * 0.153852;
    this.b3 = 0.8665 * this.b3 + white * 0.3104856;
    this.b4 = 0.55 * this.b4 + white * 0.5329522;
    this.b5 = -0.7616 * this.b5 - white * 0.016898;
    const pink = this.b0 + this.b1 + this.b2 + this.b3 + this.b4 + this.b5 + this.b6 + white * 0.5362;
    this.b6 = white * 0.115926;
    return pink * 0.11;
  }
}

export class BrownNoise {
  private last = 0;

  process(): number {
    const white = Math.random() * 2 - 1;
    this.last = (this.last + 0.02 * white) / 1.02;
    return this.last * 3.5;
  }
}

export enum NoiseType {
  WHITE = 0,
  PINK = 1,
  BROWN = 2,
}

export class NoiseGenerator {
  private white = new WhiteNoise();
  private pink = new PinkNoise();
  private brown = new BrownNoise();

  process(type: NoiseType): number {
    switch (type) {
      case NoiseType.WHITE:
        return this.white.process();
      case NoiseType.PINK:
        return this.pink.process();
      case NoiseType.BROWN:
        return this.brown.process();
    }
  }
}
