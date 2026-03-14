"use client";
import { ModSource } from "@/audio/dsp/modulation/modMatrix";
import { Panel } from "@/components/ui/Panel";
import { DND_TYPES, type ModSourceDragItem } from "@/dnd/types";
import { modFeedbackState } from "@/state/modFeedback";
import { GripHorizontal } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { useDrag } from "react-dnd";
import { useSnapshot } from "valtio";

const HISTORY_SIZE = 200;

export function RandomPanel() {
  const fb = useSnapshot(modFeedbackState);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const historyRef = useRef<number[]>([]);

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

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const history = historyRef.current;
    history.push(fb.randomValue);
    if (history.length > HISTORY_SIZE) history.shift();

    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = "#0d0d14";
    ctx.fillRect(0, 0, w, h);

    // Center line
    ctx.strokeStyle = "#2a2a45";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    // Waveform
    if (history.length > 1) {
      ctx.strokeStyle = "#ff8844";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < history.length; i++) {
        const x = (i / (HISTORY_SIZE - 1)) * w;
        const y = h / 2 - (history[i] * (h - 8)) / 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }, [fb.randomValue]);

  useEffect(() => {
    drawWaveform();
  }, [drawWaveform]);

  return (
    <Panel title="RANDOM" color="var(--accent-orange)">
      <canvas
        ref={canvasRef}
        width={200}
        height={40}
        className="w-full h-[40px] rounded bg-bg-dark mb-1"
      />
      <div className="flex justify-center">
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
