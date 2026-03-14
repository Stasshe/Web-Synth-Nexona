/** Vital-compatible distortion types (single slot per oscillator) */
export enum DistortionType {
  NONE = 0,
  SYNC = 1,
  FORMANT = 2,
  QUANTIZE = 3,
  BEND = 4,
  SQUEEZE = 5,
  PULSE_WIDTH = 6,
  FM_OSC_A = 7,   // FM modulated by Osc A output
  FM_OSC_B = 8,   // FM modulated by Osc B output
  FM_SAMPLE = 9,  // FM modulated by noise/sample signal
  RM_OSC_A = 10,  // Ring mod with Osc A
  RM_OSC_B = 11,  // Ring mod with Osc B
  RM_SAMPLE = 12, // Ring mod with noise/sample
}

// Alias for backward compat during migration
export { DistortionType as WarpType };

export const DISTORTION_NAMES: Record<number, string> = {
  [DistortionType.NONE]: "---",
  [DistortionType.SYNC]: "Sync",
  [DistortionType.FORMANT]: "Formant",
  [DistortionType.QUANTIZE]: "Quantize",
  [DistortionType.BEND]: "Bend",
  [DistortionType.SQUEEZE]: "Squeeze",
  [DistortionType.PULSE_WIDTH]: "Pulse",
  [DistortionType.FM_OSC_A]: "FM \u2190 Osc A",
  [DistortionType.FM_OSC_B]: "FM \u2190 Osc B",
  [DistortionType.FM_SAMPLE]: "FM \u2190 Sample",
  [DistortionType.RM_OSC_A]: "RM \u2190 Osc A",
  [DistortionType.RM_OSC_B]: "RM \u2190 Osc B",
  [DistortionType.RM_SAMPLE]: "RM \u2190 Sample",
};

/** Returns true if this type uses the distortionPhase secondary parameter (types 1-6) */
export function usesDistortionPhase(type: DistortionType): boolean {
  return type >= DistortionType.SYNC && type <= DistortionType.PULSE_WIDTH;
}

/** Returns true if this type performs ring modulation (phase unchanged, sample multiplied) */
export function isRMType(type: DistortionType): boolean {
  return (
    type === DistortionType.RM_OSC_A ||
    type === DistortionType.RM_OSC_B ||
    type === DistortionType.RM_SAMPLE
  );
}

/** Returns true if this type uses cross-oscillator or sample FM/RM signal */
export function usesFMSignal(type: DistortionType): boolean {
  return type >= DistortionType.FM_OSC_A;
}

/**
 * Apply phase distortion. Returns warped phase in [0, 1).
 * - distPhase: secondary phase parameter [0, 1] (only used by types 1-6)
 * - fmSignal: mono output from another oscillator [-1, 1] (for FM types)
 * - For RM types, phase is returned unchanged; apply applyRM() after wavetable lookup.
 */
export function applyDistortionPhase(
  phase: number,
  distPhase: number,
  type: DistortionType,
  amount: number,
  fmSignal = 0,
): number {
  switch (type) {
    case DistortionType.NONE:
      return phase;

    case DistortionType.SYNC: {
      // distPhase adds to the sync rate (0 = minimum, 1 = maximum shift)
      const syncRate = 1 + amount * 8 + distPhase * 4;
      const p = phase * syncRate;
      return p - Math.floor(p);
    }

    case DistortionType.FORMANT: {
      // Hard sync with window — distPhase shifts window center
      const syncP = phase * (1 + amount * 8);
      const wrapped = syncP - Math.floor(syncP);
      const windowPhase = (phase + distPhase) % 1;
      return wrapped * Math.abs(Math.sin(Math.PI * windowPhase));
    }

    case DistortionType.QUANTIZE: {
      const steps = Math.floor(4 + amount * 60);
      // distPhase offsets the grid (sub-step offset)
      const gridOffset = distPhase / steps;
      const p = (phase + gridOffset) % 1;
      return Math.floor(p * steps) / steps;
    }

    case DistortionType.BEND: {
      // Power-law phase bend; distPhase shifts pivot from center
      const pivot = 0.1 + distPhase * 0.8;
      const power = 1 + amount * 3;
      if (phase < 0.5) {
        const t = phase / 0.5;
        return pivot * (t ** power);
      }
      const t = (phase - 0.5) / 0.5;
      return pivot + (1 - pivot) * (1 - (1 - t) ** power);
    }

    case DistortionType.SQUEEZE: {
      // Asymmetric compress/expand; distPhase shifts the crossover
      const threshold = 0.1 + distPhase * 0.8;
      if (phase < 0.5) {
        return (phase / 0.5) * threshold * (1 - amount) + (phase / 0.5) * threshold * amount;
      }
      const expanded = threshold + ((phase - 0.5) / 0.5) * (1 - threshold);
      return expanded;
    }

    case DistortionType.PULSE_WIDTH: {
      // distPhase sets the pulse width base; amount modulates depth
      const pw = 0.1 + distPhase * 0.8;
      const effectivePw = pw * (1 - amount * 0.8);
      const minPw = Math.max(0.02, effectivePw);
      if (phase < minPw) {
        return (phase / minPw) * 0.5;
      }
      return 0.5 + ((phase - minPw) / (1 - minPw)) * 0.5;
    }

    case DistortionType.FM_OSC_A:
    case DistortionType.FM_OSC_B:
    case DistortionType.FM_SAMPLE: {
      // Frequency modulation: phase += modIndex * fmSignal
      const modIndex = amount * 8;
      let p = phase + modIndex * fmSignal;
      p = p - Math.floor(p);
      if (p < 0) p += 1;
      return p;
    }

    case DistortionType.RM_OSC_A:
    case DistortionType.RM_OSC_B:
    case DistortionType.RM_SAMPLE:
      // Ring mod: phase unchanged, sample is multiplied in applyRM()
      return phase;

    default:
      return phase;
  }
}

/**
 * Apply ring modulation to a sample AFTER wavetable lookup.
 * No-op for non-RM types.
 */
export function applyRingMod(
  sample: number,
  type: DistortionType,
  amount: number,
  fmSignal: number,
): number {
  if (type === DistortionType.RM_OSC_A || type === DistortionType.RM_OSC_B || type === DistortionType.RM_SAMPLE) {
    return sample * (1 - amount + amount * fmSignal);
  }
  return sample;
}

// Legacy export for any code still using applyWarp
export function applyWarp(phase: number, type: DistortionType, amount: number, fmSignal = 0): number {
  return applyDistortionPhase(phase, 0.5, type, amount, fmSignal);
}
