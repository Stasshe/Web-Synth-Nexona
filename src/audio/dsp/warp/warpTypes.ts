export enum WarpType {
  NONE = 0,
  BEND = 1,
  SYNC = 2,
  PHASE_DISTORTION = 3,
  MIRROR = 4,
  QUANTIZE = 5,
  FM = 6,
}

/** Warp phase before wavetable lookup. Input/output in [0, 1). */
export function applyWarp(phase: number, type: WarpType, amount: number, fmSignal = 0): number {
  switch (type) {
    case WarpType.NONE:
      return phase;

    case WarpType.BEND: {
      if (phase < 0.5) {
        return 0.5 * phase ** (1 + amount * 3) / (0.5 ** (1 + amount * 3));
      }
      const inv = 1 - phase;
      return 1 - 0.5 * inv ** (1 + amount * 3) / (0.5 ** (1 + amount * 3));
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
        return phase / threshold * 0.5;
      }
      return 0.5 - (phase - threshold) / (1 - threshold) * 0.5;
    }

    case WarpType.QUANTIZE: {
      const steps = Math.floor(4 + amount * 60);
      return Math.floor(phase * steps) / steps;
    }

    case WarpType.FM: {
      let p = phase + fmSignal * amount;
      p = p - Math.floor(p);
      if (p < 0) p += 1;
      return p;
    }
  }
}
