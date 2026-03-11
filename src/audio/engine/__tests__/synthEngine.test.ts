import { describe, expect, it } from "vitest";
import { SynthEngine } from "../synthEngine";

describe("SynthEngine", () => {
  const SR = 48000;
  const BLOCK = 128;

  function makeOutput(): Float32Array[] {
    return [new Float32Array(BLOCK), new Float32Array(BLOCK)];
  }

  it("outputs silence when no note is playing", () => {
    const engine = new SynthEngine(SR);
    const out = makeOutput();
    engine.processBlock(out);
    for (let i = 0; i < BLOCK; i++) {
      expect(out[0][i]).toBe(0);
      expect(out[1][i]).toBe(0);
    }
  });

  it("outputs audio when noteOn is triggered", () => {
    const engine = new SynthEngine(SR);
    engine.noteOn(60, 127);

    const out = makeOutput();
    engine.processBlock(out);

    const hasSound = out[0].some((v) => Math.abs(v) > 0.0001);
    expect(hasSound).toBe(true);
  });

  it("output is bounded", () => {
    const engine = new SynthEngine(SR);
    engine.noteOn(60, 127);

    for (let block = 0; block < 100; block++) {
      const out = makeOutput();
      engine.processBlock(out);
      for (let i = 0; i < BLOCK; i++) {
        expect(Math.abs(out[0][i])).toBeLessThan(2);
      }
    }
  });

  it("returns to silence after noteOff and release", () => {
    const engine = new SynthEngine(SR);
    engine.noteOn(60, 127);

    // Play a few blocks
    for (let i = 0; i < 10; i++) {
      engine.processBlock(makeOutput());
    }

    engine.noteOff(60);

    // Process enough blocks for release to complete
    for (let i = 0; i < 2000; i++) {
      engine.processBlock(makeOutput());
    }

    const out = makeOutput();
    engine.processBlock(out);
    const maxAbs = Math.max(...out[0].map(Math.abs));
    expect(maxAbs).toBeLessThan(0.001);
  });

  it("supports polyphony", () => {
    const engine = new SynthEngine(SR);
    engine.noteOn(60, 100);
    engine.noteOn(64, 100);
    engine.noteOn(67, 100);

    const out = makeOutput();
    engine.processBlock(out);

    const hasSound = out[0].some((v) => Math.abs(v) > 0.0001);
    expect(hasSound).toBe(true);
  });

  it("stops note independently with noteOff", () => {
    const engine = new SynthEngine(SR);
    engine.noteOn(60, 100);
    engine.noteOn(64, 100);

    for (let i = 0; i < 5; i++) engine.processBlock(makeOutput());

    engine.noteOff(60);

    // Let note 60 release
    for (let i = 0; i < 2000; i++) engine.processBlock(makeOutput());

    // Note 64 should still have sound
    const out = makeOutput();
    engine.processBlock(out);
    const hasSound = out[0].some((v) => Math.abs(v) > 0.0001);
    expect(hasSound).toBe(true);
  });
});
