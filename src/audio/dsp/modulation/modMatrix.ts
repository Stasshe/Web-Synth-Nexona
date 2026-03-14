export enum ModSource {
  LFO1 = 0,
  LFO2 = 1,
  AMP_ENV = 2,
  FILTER_ENV = 3,
  VELOCITY = 4,
  KEY_TRACK = 5,
  MACRO1 = 6,
  MACRO2 = 7,
  MACRO3 = 8,
  MACRO4 = 9,
  RANDOM = 10,
}

export enum ModTarget {
  OSC_A_PITCH = 0,
  OSC_A_FRAME = 1,
  OSC_A_WARP_AMOUNT = 2,
  OSC_A_LEVEL = 3,
  OSC_B_PITCH = 4,
  OSC_B_FRAME = 5,
  OSC_B_WARP_AMOUNT = 6,
  OSC_B_LEVEL = 7,
  FILTER_CUTOFF = 8,
  FILTER_RESONANCE = 9,
  AMP_LEVEL = 10,
  PAN = 11,
  OSC_C_PITCH = 12,
  OSC_C_FRAME = 13,
  OSC_C_WARP_AMOUNT = 14,
  OSC_C_LEVEL = 15,
  FILTER2_CUTOFF = 16,
  FILTER2_RESONANCE = 17,
  OSC_A_SPECTRAL_MORPH = 18,
  OSC_B_SPECTRAL_MORPH = 19,
  OSC_C_SPECTRAL_MORPH = 20,
  OSC_A_PAN = 21,
  OSC_B_PAN = 22,
  OSC_C_PAN = 23,
  OSC_A_UNISON_DETUNE = 24,
  OSC_B_UNISON_DETUNE = 25,
  OSC_C_UNISON_DETUNE = 26,
  OSC_A_UNISON_SPREAD = 27,
  OSC_B_UNISON_SPREAD = 28,
  OSC_C_UNISON_SPREAD = 29,
  FILTER_DRIVE = 30,
  FILTER2_DRIVE = 31,
  FILTER_ENV_AMOUNT = 32,
  FILTER2_ENV_AMOUNT = 33,
  NOISE_LEVEL = 34,
  SUB_LEVEL = 35,
  OSC_A_DISTORTION_PHASE = 36, // replaces OSC_A_WARP2_AMOUNT
  OSC_B_DISTORTION_PHASE = 37, // replaces OSC_B_WARP2_AMOUNT
  OSC_C_DISTORTION_PHASE = 38, // replaces OSC_C_WARP2_AMOUNT

  // Effects
  DIST_DRIVE = 39,
  DIST_MIX = 40,
  CHORUS_RATE = 41,
  CHORUS_DEPTH = 42,
  CHORUS_MIX = 43,
  FLANGER_RATE = 44,
  FLANGER_DEPTH = 45,
  FLANGER_FEEDBACK = 46,
  FLANGER_MIX = 47,
  PHASER_RATE = 48,
  PHASER_DEPTH = 49,
  PHASER_FEEDBACK = 50,
  PHASER_MIX = 51,
  DELAY_TIME = 52,
  DELAY_FEEDBACK = 53,
  DELAY_MIX = 54,
  REVERB_DECAY = 55,
  REVERB_MIX = 56,
  EQ_LOW = 57,
  EQ_MID = 58,
  EQ_HIGH = 59,
}

export interface ModRoute {
  source: ModSource;
  target: ModTarget;
  amount: number; // -1 to 1
}

export class ModulationMatrix {
  private routes: ModRoute[] = [];
  private sourceValues = new Float32Array(11); // One per ModSource

  setRoutes(routes: ModRoute[]): void {
    this.routes = routes;
  }

  setSourceValue(source: ModSource, value: number): void {
    this.sourceValues[source] = value;
  }

  /** Get total modulation for a target. Returns summed modulation amount. */
  getModulation(target: ModTarget): number {
    let sum = 0;
    for (const route of this.routes) {
      if (route.target === target) {
        sum += this.sourceValues[route.source] * route.amount;
      }
    }
    return sum;
  }

  /** Apply modulation to a base value for a given target. */
  apply(target: ModTarget, baseValue: number, range: number): number {
    return baseValue + this.getModulation(target) * range;
  }
}
