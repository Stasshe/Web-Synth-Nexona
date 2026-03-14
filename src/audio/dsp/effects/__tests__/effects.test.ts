import { describe, expect, it } from "vitest";
import { Chorus } from "../chorus";
import { Delay } from "../delay";
import { EffectsChain } from "../effectsChain";
import { Limiter } from "../limiter";
import { Reverb } from "../reverb";

const SR = 48000;

describe("Chorus", () => {
  it("passes dry signal when mix is 0", () => {
    const chorus = new Chorus(SR);
    chorus.setParams(1, 0.5, 0);
    const [l, r] = chorus.process(0.5, -0.5);
    expect(l).toBe(0.5);
    expect(r).toBe(-0.5);
  });

  it("produces modulated output when mix > 0", () => {
    const chorus = new Chorus(SR);
    chorus.setParams(1, 0.5, 0.5);
    // Feed a constant signal
    let diffFound = false;
    for (let i = 0; i < 2000; i++) {
      const [l] = chorus.process(0.5, 0.5);
      if (Math.abs(l - 0.5) > 0.001) diffFound = true;
    }
    expect(diffFound).toBe(true);
  });
});

describe("Delay", () => {
  it("passes dry signal when mix is 0", () => {
    const delay = new Delay(SR);
    delay.setParams(0.375, 0.3, 0);
    const [l, r] = delay.process(0.5, -0.5);
    expect(l).toBe(0.5);
    expect(r).toBe(-0.5);
  });

  it("produces delayed echoes when mix > 0", () => {
    const delay = new Delay(SR);
    delay.setParams(0.01, 0.5, 0.5); // 10ms delay
    const delaySamples = Math.floor(0.01 * SR);

    // Send an impulse
    delay.process(1, 1);
    // Process enough silence to reach the delay tap
    let echoFound = false;
    for (let i = 1; i <= delaySamples + 10; i++) {
      const [l] = delay.process(0, 0);
      if (Math.abs(l) > 0.01) echoFound = true;
    }
    expect(echoFound).toBe(true);
  });
});

describe("Reverb", () => {
  it("passes dry signal when mix is 0", () => {
    const reverb = new Reverb(SR);
    reverb.setParams(0.7, 0);
    const [l, r] = reverb.process(0.5, -0.5);
    expect(l).toBe(0.5);
    expect(r).toBe(-0.5);
  });

  it("adds reverb tail when mix > 0", () => {
    const reverb = new Reverb(SR);
    reverb.setParams(0.7, 0.5);

    // Send impulse then silence
    reverb.process(1, 1);
    for (let i = 0; i < 5000; i++) {
      reverb.process(0, 0);
    }
    // After long silence, tail should still produce something
    const [l] = reverb.process(0, 0);
    expect(Math.abs(l)).toBeGreaterThan(0);
  });
});

describe("Limiter", () => {
  it("reduces loud signals", () => {
    const limiter = new Limiter(SR);
    // Build up the envelope with loud signal
    for (let i = 0; i < 500; i++) {
      limiter.process(2, 2);
    }
    const [l] = limiter.process(2, 2);
    expect(Math.abs(l)).toBeLessThan(2);
  });

  it("passes quiet signals unchanged after settling", () => {
    const limiter = new Limiter(SR);
    // Let it settle with quiet signal
    for (let i = 0; i < 10000; i++) {
      limiter.process(0.1, 0.1);
    }
    const [l] = limiter.process(0.1, 0.1);
    expect(l).toBeCloseTo(0.1, 2);
  });
});

describe("EffectsChain", () => {
  it("processes signal through all effects", () => {
    const chain = new EffectsChain(SR);
    chain.setParams({
      distortionDrive: 1,
      distortionTone: 0.5,
      distortionMix: 0,
      distortionMode: 0,
      compThreshold: -12,
      compRatio: 4,
      compAttack: 0.01,
      compRelease: 0.1,
      compMakeup: 0,
      compMix: 0,
      compKnee: 0,
      chorusRate: 1,
      chorusDepth: 0.3,
      chorusMix: 0.3,
      flangerRate: 0.5,
      flangerDepth: 0.5,
      flangerFeedback: 0.5,
      flangerMix: 0,
      phaserRate: 0.5,
      phaserDepth: 0.5,
      phaserFeedback: 0.5,
      phaserMix: 0,
      delayTime: 0.3,
      delayFeedback: 0.3,
      delayMix: 0.3,
      reverbDecay: 0.5,
      reverbMix: 0.3,
      eqLowGain: 0,
      eqMidGain: 0,
      eqHighGain: 0,
      eqMix: 0,
    });

    // Should not throw, should return stereo
    const [l, r] = chain.process(0.5, 0.5);
    expect(typeof l).toBe("number");
    expect(typeof r).toBe("number");
    expect(Number.isFinite(l)).toBe(true);
    expect(Number.isFinite(r)).toBe(true);
  });
});
