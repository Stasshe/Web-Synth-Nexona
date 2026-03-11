import { describe, expect, it } from "vitest";
import { lerp } from "../interpolation";

describe("lerp", () => {
  it("returns a when t = 0", () => {
    expect(lerp(1.0, 5.0, 0)).toBe(1.0);
  });

  it("returns b when t = 1", () => {
    expect(lerp(1.0, 5.0, 1)).toBe(5.0);
  });

  it("returns midpoint when t = 0.5", () => {
    expect(lerp(0.0, 10.0, 0.5)).toBe(5.0);
  });

  it("interpolates correctly at t = 0.25", () => {
    expect(lerp(0.0, 4.0, 0.25)).toBe(1.0);
  });
});
