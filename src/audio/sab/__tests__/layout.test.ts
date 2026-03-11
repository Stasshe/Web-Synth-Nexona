import { describe, expect, it } from "vitest";
import { SabParam, floatToInt32, getParam, int32ToFloat, setParam } from "../layout";

describe("SAB layout", () => {
  it("round-trips float through int32 encoding", () => {
    const values = [0, 1, -1, 0.5, Math.PI, 440, 0.001, 20000];
    for (const v of values) {
      expect(int32ToFloat(floatToInt32(v))).toBeCloseTo(v, 5);
    }
  });

  it("setParam and getParam work with SharedArrayBuffer", () => {
    const sab = new SharedArrayBuffer(256 * 4);
    const view = new Int32Array(sab);

    setParam(view, SabParam.MasterVolume, 0.75);
    expect(getParam(view, SabParam.MasterVolume)).toBe(0.75);

    setParam(view, SabParam.FilterCutoff, 5000);
    expect(getParam(view, SabParam.FilterCutoff)).toBe(5000);
  });

  it("different params are independent", () => {
    const sab = new SharedArrayBuffer(256 * 4);
    const view = new Int32Array(sab);

    setParam(view, SabParam.AmpEnvAttack, 0.01);
    setParam(view, SabParam.AmpEnvRelease, 0.5);

    expect(getParam(view, SabParam.AmpEnvAttack)).toBeCloseTo(0.01, 5);
    expect(getParam(view, SabParam.AmpEnvRelease)).toBeCloseTo(0.5, 5);
  });
});
