"use client";

import { loadPatchIntoState } from "@/patch/loader";
import { SelectWithArrows } from "@/components/ui/SelectWithArrows";
import { FACTORY_PRESETS } from "@/data/presets.generated";
import { useState } from "react";

const PRESET_OPTIONS = FACTORY_PRESETS.map((p, i) => ({
  value: String(i),
  label: p.name,
}));

interface PresetSelectorProps {
  /** Called after a preset is loaded, so the parent can re-apply custom wavetables / mod routes */
  onLoad?: () => void;
}

export function PresetSelector({ onLoad }: PresetSelectorProps) {
  const [currentIdx, setCurrentIdx] = useState(0);

  function handleChange(value: string) {
    const idx = Number(value);
    setCurrentIdx(idx);
    loadPatchIntoState(FACTORY_PRESETS[idx]);
    onLoad?.();
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[8px] text-text-muted uppercase tracking-wider">Preset</span>
      <SelectWithArrows
        value={String(currentIdx)}
        options={PRESET_OPTIONS}
        onChange={handleChange}
        className="w-32"
      />
    </div>
  );
}
