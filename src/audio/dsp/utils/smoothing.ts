export class ParamSmoother {
  current: number;
  target: number;
  private alpha: number;

  constructor(initial: number, alpha = 0.005) {
    this.current = initial;
    this.target = initial;
    this.alpha = alpha;
  }

  setTarget(value: number): void {
    this.target = value;
  }

  tick(): number {
    this.current += (this.target - this.current) * this.alpha;
    return this.current;
  }

  snap(): void {
    this.current = this.target;
  }
}
