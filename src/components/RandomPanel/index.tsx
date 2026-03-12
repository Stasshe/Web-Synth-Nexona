"use client";
import { ModSource } from "@/audio/dsp/modulation/modMatrix";
import { Panel } from "@/components/ui/Panel";
import { DND_TYPES, type ModSourceDragItem } from "@/dnd/types";
import { GripHorizontal } from "lucide-react";
import { useDrag } from "react-dnd";

export function RandomPanel() {
  const [{ isDragging }, dragRef] = useDrag(
    () => ({
      type: DND_TYPES.MOD_SOURCE,
      item: { source: ModSource.RANDOM, label: "Random" } as ModSourceDragItem,
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    }),
    [],
  );

  return (
    <Panel title="RANDOM" color="var(--accent-orange)">
      <div className="flex justify-center py-1">
        <div
          ref={dragRef as unknown as React.Ref<HTMLDivElement>}
          className="flex flex-col items-center gap-0.5 cursor-grab active:cursor-grabbing select-none transition-opacity"
          style={{ opacity: isDragging ? 0.4 : 1 }}
          title="Drag to assign Random modulation"
        >
          <GripHorizontal size={16} className="text-accent-orange" />
          <span className="text-[8px] text-accent-orange uppercase tracking-wider">MOD</span>
        </div>
      </div>
    </Panel>
  );
}
