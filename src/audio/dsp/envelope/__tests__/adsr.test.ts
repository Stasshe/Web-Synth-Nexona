import { describe, expect, it } from "vitest";
import { ADSREnvelope, EnvelopeState } from "../adsr";

describe("ADSREnvelope", () => {
  const SR = 48000;

  it("starts in IDLE state with level 0", () => {
    const env = new ADSREnvelope(SR);
    expect(env.state).toBe(EnvelopeState.IDLE);
    expect(env.getLevel()).toBe(0);
    expect(env.isIdle()).toBe(true);
  });

  it("transitions to ATTACK on gate", () => {
    const env = new ADSREnvelope(SR);
    env.setParams(0.01, 0.1, 0.7, 0.3);
    env.gate();
    expect(env.state).toBe(EnvelopeState.ATTACK);
    expect(env.isIdle()).toBe(false);
  });

  it("reaches peak during attack", () => {
    const env = new ADSREnvelope(SR);
    env.setParams(0.01, 0.1, 0.7, 0.3);
    env.gate();
    for (let i = 0; i < SR * 0.02; i++) env.process();
    expect(env.getLevel()).toBeCloseTo(1.0, 1);
  });

  it("settles at sustain level after decay", () => {
    const env = new ADSREnvelope(SR);
    env.setParams(0.001, 0.01, 0.5, 0.3);
    env.gate();
    for (let i = 0; i < SR * 0.5; i++) env.process();
    expect(env.state).toBe(EnvelopeState.SUSTAIN);
    expect(env.getLevel()).toBeCloseTo(0.5, 2);
  });

  it("returns to IDLE after release", () => {
    const env = new ADSREnvelope(SR);
    env.setParams(0.001, 0.001, 0.5, 0.01);
    env.gate();
    for (let i = 0; i < SR * 0.1; i++) env.process();
    env.release();
    for (let i = 0; i < SR * 0.5; i++) env.process();
    expect(env.isIdle()).toBe(true);
    expect(env.getLevel()).toBe(0);
  });

  it("level stays between 0 and 1", () => {
    const env = new ADSREnvelope(SR);
    env.setParams(0.01, 0.1, 0.7, 0.3);
    env.gate();
    for (let i = 0; i < SR * 2; i++) {
      const level = env.process();
      expect(level).toBeGreaterThanOrEqual(0);
      expect(level).toBeLessThanOrEqual(1);
    }
  });
});
