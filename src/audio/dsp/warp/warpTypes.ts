export enum WarpType {
  NONE = 0,
  BEND = 1,
  SYNC = 2,
  PHASE_DISTORTION = 3,
  MIRROR = 4,
  QUANTIZE = 5,
  FM = 6,
  FORMANT = 7,
  SQUEEZE = 8,
  PULSE_WIDTH = 9,
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

    case WarpType.FM: {
      // Self-FM: 2:1 ratio modulator for classic FM bell/metallic timbres.
      // Distinct from PD which uses 1:1 ratio.
      const modIndex = amount * 4;
      let p = phase + modIndex * Math.sin(2 * Math.PI * phase * 2) + fmSignal * amount;
      p = p - Math.floor(p);
      if (p < 0) p += 1;
      return p;
    }

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
