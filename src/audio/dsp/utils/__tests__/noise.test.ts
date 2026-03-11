import { describe, expect, it } from "vitest";
import { NoiseGenerator, NoiseType } from "../noise";

describe("NoiseGenerator", () => {
  const gen = new NoiseGenerator();
  const N = 10000;

  it("white noise has near-zero mean", () => {
    let sum = 0;
    for (let i = 0; i < N; i++) sum += gen.process(NoiseType.WHITE);
    expect(Math.abs(sum / N)).toBeLessThan(0.05);
  });

  it("pink noise output is bounded", () => {
    for (let i = 0; i < N; i++) {
      const v = gen.process(NoiseType.PINK);
      expect(Math.abs(v)).toBeLessThan(2);
    }
  });

  it("brown noise output is bounded", () => {
    for (let i = 0; i < N; i++) {
      const v = gen.process(NoiseType.BROWN);
      expect(Math.abs(v)).toBeLessThan(5);
    }
  });
});
