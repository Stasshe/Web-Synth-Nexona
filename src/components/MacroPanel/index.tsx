"use client";
import { ModSource } from "@/audio/dsp/modulation/modMatrix";
import { Knob } from "@/components/ui/Knob";
import { Panel } from "@/components/ui/Panel";
import { DND_TYPES, type ModSourceDragItem } from "@/dnd/types";
import { synthState } from "@/state/synthState";
import { GripHorizontal } from "lucide-react";
import { useMemo } from "react";
import { useDrag } from "react-dnd";
import { useSnapshot } from "valtio";

const MACRO_SOURCES = [ModSource.MACRO1, ModSource.MACRO2, ModSource.MACRO3, ModSource.MACRO4];

function MacroKnobWithDrag({ index }: { index: number }) {
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
    <div className="flex flex-col items-center gap-1">
      <Knob
        label={label}
        value={macroValue}
        min={0}
        max={1}
        onChange={(v) => (synthState.macros[index] = v)}
        size={32}
        color="var(--accent-orange)"
      />
      <div
        ref={dragRef as unknown as React.Ref<HTMLDivElement>}
        className="flex items-center justify-center cursor-grab active:cursor-grabbing select-none transition-opacity"
        style={{ opacity: isDragging ? 0.4 : 1 }}
        title={`Drag ${label} to assign modulation`}
      >
        <GripHorizontal size={12} className="text-accent-orange" />
      </div>
    </div>
  );
}

export function MacroPanel() {
  const macros = useMemo(() => [0, 1, 2, 3], []);

  return (
    <Panel title="MACROS" color="var(--accent-orange)">
      <div className="flex gap-2 justify-center">
        {macros.map((i) => (
          <MacroKnobWithDrag key={i} index={i} />
        ))}
      </div>
    </Panel>
  );
}
