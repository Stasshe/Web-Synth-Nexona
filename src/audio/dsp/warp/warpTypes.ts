export enum WarpType {
  NONE = 0,
  BEND = 1,
  SYNC = 2,
  PHASE_DISTORTION = 3,
  MIRROR = 4,
  QUANTIZE = 5,
  FORMANT = 6,
  SQUEEZE = 7,
  PULSE_WIDTH = 8,
  FM_1_1 = 9,  // ratio 1:1 — bright, aliasy character
  FM_2_1 = 10,   // ratio 2:1 — classic bell/metallic (DX7-style)
  FM_3_1 = 11,  // ratio 3:1 — complex metallic
  FM_4_1 = 12,  // ratio 4:1 — glassy, inharmonic
}

/**
 * Vital-style self-FM helper.
 * modIndex = amount * 8  → 0..8 radians of peak phase deviation (like Vital).
 * p = phase + modIndex * sin(2π * ratio * phase)
 */
function applyFM(phase: number, amount: number, ratio: number, fmSignal: number): number {
  const modIndex = amount * 8;
  let p = phase + modIndex * Math.sin(2 * Math.PI * ratio * phase) + fmSignal * amount;
  p -= Math.floor(p);
  if (p < 0) p += 1;
  return p;
}

/** Warp phase before wavetable lookup. Input/output in [0, 1). */
export function applyWarp(phase: number, type: WarpType, amount: number, fmSignal = 0): number {
  switch (type) {
    case WarpType.NONE:
      return phase;

    case WarpType.BEND: {
      if (phase < 0.5) {
        return (0.5 * phase ** (1 + amount * 3)) / 0.5 ** (1 + amount * 3);
      }
      const inv = 1 - phase;
      return 1 - (0.5 * inv ** (1 + amount * 3)) / 0.5 ** (1 + amount * 3);
    }

    case WarpType.SYNC: {
      const p = phase * (1 + amount * 8);
      return p - Math.floor(p);
    }

    case WarpType.PHASE_DISTORTION: {
      let p = phase + amount * Math.sin(2 * Math.PI * phase);
      p = p - Math.floor(p);
      return p;
    }

    case WarpType.MIRROR: {
      const threshold = 0.1 + amount * 0.8;
      if (phase < threshold) {
        return (phase / threshold) * 0.5;
      }
      return 0.5 - ((phase - threshold) / (1 - threshold)) * 0.5;
    }

    case WarpType.QUANTIZE: {
      const steps = Math.floor(4 + amount * 60);
      return Math.floor(phase * steps) / steps;
    }

    // --- FM types (Vital-style: phase += modIndex * sin(2π * ratio * phase)) ---

    case WarpType.FM_1_1:
      return applyFM(phase, amount, 1, fmSignal);

    case WarpType.FM_2_1:
      return applyFM(phase, amount, 2, fmSignal);

    case WarpType.FM_3_1:
      return applyFM(phase, amount, 3, fmSignal);

    case WarpType.FM_4_1:
      return applyFM(phase, amount, 4, fmSignal);

    case WarpType.FORMANT: {
      // Hard sync with half-sine window — creates formant-like spectral peak
      const syncP = phase * (1 + amount * 8);
      const wrapped = syncP - Math.floor(syncP);
      // Apply half-sine window to emphasize fundamental pitch
      return wrapped * Math.sin(Math.PI * phase);
    }

    case WarpType.SQUEEZE: {
      // Asymmetric phase compression — squeezes first half, stretches second
      const threshold = 0.1 + amount * 0.4; // crossover point moves with amount
      if (phase < 0.5) {
        return (phase / 0.5) * threshold;
      }
      return threshold + ((phase - 0.5) / 0.5) * (1 - threshold);
    }

    case WarpType.PULSE_WIDTH: {
      // Remap phase to create PWM effect on any waveform
      const pw = 0.1 + amount * 0.8; // pulse width 10%-90%
      if (phase < pw) {
        return (phase / pw) * 0.5;
      }
      return 0.5 + ((phase - pw) / (1 - pw)) * 0.5;
    }
  }
}
