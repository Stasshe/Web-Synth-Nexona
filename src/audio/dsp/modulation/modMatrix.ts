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
}

export interface ModRoute {
  source: ModSource;
  target: ModTarget;
  amount: number; // -1 to 1
}

export class ModulationMatrix {
  private routes: ModRoute[] = [];
  private sourceValues = new Float32Array(10); // One per ModSource

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
