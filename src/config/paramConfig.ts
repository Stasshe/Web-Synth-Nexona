export interface ParamDef {
  default: number | boolean;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  scale?: string;
  enum?: string[];
  count?: number;
}

export interface ParamConfig {
  oscillators: {
    a: Record<string, ParamDef>;
    b: Record<string, ParamDef>;
    sub: Record<string, ParamDef>;
  };
  noise: Record<string, ParamDef>;
  filter: Record<string, ParamDef>;
  envelopes: {
    amp: Record<string, ParamDef>;
    filter: Record<string, ParamDef>;
  };
  lfos: {
    lfo1: Record<string, ParamDef>;
    lfo2: Record<string, ParamDef>;
  };
  effects: {
    chorus: Record<string, ParamDef>;
    delay: Record<string, ParamDef>;
    reverb: Record<string, ParamDef>;
  };
  master: Record<string, ParamDef>;
  drift: ParamDef;
  macros: ParamDef;
  modulation: {
    maxRoutes: number;
    sources: string[];
    targets: string[];
    amount: ParamDef;
  };
}

let cachedConfig: ParamConfig | null = null;

function stripJsoncComments(text: string): string {
  return text.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
}

export async function loadParamConfig(): Promise<ParamConfig> {
  if (cachedConfig) return cachedConfig;

  const res = await fetch("/config/params.jsonc");
  const text = await res.text();
  const json = JSON.parse(stripJsoncComments(text));
  cachedConfig = json as ParamConfig;
  return cachedConfig;
}

export function getParamDef(config: ParamConfig, path: string): ParamDef | undefined {
  const parts = path.split(".");
  let current: unknown = config;
  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return current as ParamDef;
}

export function applyConfigDefaults(config: ParamConfig): void {
  // This function is available for resetting state to config defaults.
  // Individual components read from the config for their min/max/step.
  return void config;
}
