"use client";
import { ModSource } from "@/audio/dsp/modulation/modMatrix";
import { Knob } from "@/components/ui/Knob";
import { DND_TYPES, type ModSourceDragItem } from "@/dnd/types";
import { synthState } from "@/state/synthState";
import { GripVertical } from "lucide-react";
import { useMemo } from "react";
import { useDrag } from "react-dnd";
import { useSnapshot } from "valtio";

const MACRO_SOURCES = [ModSource.MACRO1, ModSource.MACRO2, ModSource.MACRO3, ModSource.MACRO4];

function MacroKnob({ index }: { index: number }) {
  const snap = useSnapshot(synthState);
  const macroValue = snap.macros[index];
  const modSource = MACRO_SOURCES[index];
  const label = `M${index + 1}`;

  const [{ isDragging }, dragRef] = useDrag(
    () => ({
      type: DND_TYPES.MOD_SOURCE,
      item: { source: modSource, label } as ModSourceDragItem,
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    }),
    [modSource, label],
  );

  return (
    <div
      className="flex flex-col items-center gap-1 py-1"
      style={{ opacity: isDragging ? 0.4 : 1 }}
    >
      <Knob
        label={label}
        value={macroValue}
        min={0}
        max={1}
        onChange={(v) => (synthState.macros[index] = v)}
        size={36}
        color="var(--accent-orange)"
      />
      <div
        ref={dragRef as unknown as React.Ref<HTMLDivElement>}
        className="cursor-grab active:cursor-grabbing select-none"
        title={`Drag ${label} to assign modulation`}
      >
        <GripVertical size={12} className="text-accent-orange opacity-60" />
      </div>
    </div>
  );
}

/** Vertical macro strip — used in the Vital-style left sidebar. */
export function MacroStrip() {
  const indices = useMemo(() => [0, 1, 2, 3], []);
  return (
    <div className="flex flex-col bg-bg-panel border border-border-default rounded-lg px-1 py-2 gap-0 h-full">
      <span className="text-[8px] font-bold tracking-widest text-text-muted text-center mb-1 uppercase shrink-0">
        Macro
      </span>
      <div className="flex-1 flex flex-col justify-around min-h-0">
        {indices.map((i) => (
          <MacroKnob key={i} index={i} />
        ))}
      </div>
    </div>
  );
}

/** Legacy horizontal layout — kept for backward compatibility. */
export function MacroPanel() {
  return (
    <div className="flex gap-2 justify-center bg-bg-panel border border-border-default rounded-lg px-4 py-2">
      <MacroStrip />
    </div>
  );
}
