import { describe, expect, it } from "vitest";
import { flushDenormal } from "../denormal";

describe("flushDenormal", () => {
  it("returns 0 for very small positive values", () => {
    expect(flushDenormal(1e-20)).toBe(0);
  });

  it("returns 0 for very small negative values", () => {
    expect(flushDenormal(-1e-20)).toBe(0);
  });

  it("returns 0 for zero", () => {
    expect(flushDenormal(0)).toBe(0);
  });

  it("passes through normal positive values", () => {
    expect(flushDenormal(0.5)).toBe(0.5);
  });

  it("passes through normal negative values", () => {
    expect(flushDenormal(-0.5)).toBe(-0.5);
  });

  it("passes through values near the threshold", () => {
    expect(flushDenormal(1e-10)).not.toBe(0);
  });
});
