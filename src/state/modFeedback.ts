import type { ModFeedback } from "@/audio/engine/synthEngine";
import { proxy } from "valtio";

export const modFeedbackState = proxy<ModFeedback>({
  lfo1Phase: 0,
  lfo2Phase: 0,
  lfo1Value: 0,
  lfo2Value: 0,
  randomValue: 0,
  envAmpLevel: 0,
  envAmpState: 0,
  envFilterLevel: 0,
  envFilterState: 0,
});

export function updateModFeedback(fb: ModFeedback): void {
  modFeedbackState.lfo1Phase = fb.lfo1Phase;
  modFeedbackState.lfo2Phase = fb.lfo2Phase;
  modFeedbackState.lfo1Value = fb.lfo1Value;
  modFeedbackState.lfo2Value = fb.lfo2Value;
  modFeedbackState.randomValue = fb.randomValue;
  modFeedbackState.envAmpLevel = fb.envAmpLevel;
  modFeedbackState.envAmpState = fb.envAmpState;
  modFeedbackState.envFilterLevel = fb.envFilterLevel;
  modFeedbackState.envFilterState = fb.envFilterState;
}
