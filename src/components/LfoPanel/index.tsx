"use client";
import { ModSource } from "@/audio/dsp/modulation/modMatrix";
import { Knob } from "@/components/ui/Knob";
import { Panel } from "@/components/ui/Panel";
import { DND_TYPES, type ModSourceDragItem } from "@/dnd/types";
import { modFeedbackState } from "@/state/modFeedback";
import { synthState } from "@/state/synthState";
import { GripHorizontal } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { useDrag } from "react-dnd";
import { useSnapshot } from "valtio";

const LFO_SHAPES = [
  { value: "0", label: "SIN" },
  { value: "1", label: "TRI" },
  { value: "2", label: "SQR" },
  { value: "3", label: "RND" },
];

interface LfoPanelProps {
  index: "lfo1" | "lfo2";
}

export function LfoPanel({ index }: LfoPanelProps) {
  const snap = useSnapshot(synthState);
  const fb = useSnapshot(modFeedbackState);
  const lfo = snap.lfos[index];
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const label = index === "lfo1" ? "LFO 1" : "LFO 2";
  const modSource = index === "lfo1" ? ModSource.LFO1 : ModSource.LFO2;
  const phase = index === "lfo1" ? fb.lfo1Phase : fb.lfo2Phase;

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

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

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
    ctx.strokeStyle = "#8844ff";
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    for (let x = 0; x < w; x++) {
      const p = x / w;
      let y = 0;
      switch (lfo.shape) {
        case 0:
          y = Math.sin(2 * Math.PI * p);
          break;
        case 1:
          if (p < 0.25) y = p * 4;
          else if (p < 0.75) y = 2 - p * 4;
          else y = p * 4 - 4;
          break;
        case 2:
          y = p < 0.5 ? 1 : -1;
          break;
        case 3:
          y = Math.sin(2 * Math.PI * p * 3) > 0 ? 0.6 : -0.4;
          break;
      }
      const py = h / 2 - (y * (h - 16)) / 2;
      if (x === 0) ctx.moveTo(x, py);
      else ctx.lineTo(x, py);
    }
    ctx.stroke();

    // Phase indicator (playhead)
    if (phase > 0) {
      const px = phase * w;
      ctx.strokeStyle = "rgba(136, 68, 255, 0.5)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, h);
      ctx.stroke();
    }
  }, [lfo.shape, phase]);

  useEffect(() => {
    drawWaveform();
  }, [drawWaveform]);

  return (
    <Panel title={label} color="var(--lfo)">
      <canvas
        ref={canvasRef}
        width={200}
        height={40}
        className="w-full h-[40px] rounded bg-bg-dark mb-1"
      />

      <div className="flex gap-1 mb-2">
        {LFO_SHAPES.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => (synthState.lfos[index].shape = Number(s.value))}
            className={`flex-1 text-[9px] py-0.5 rounded border transition-colors ${
              lfo.shape === Number(s.value)
                ? "border-lfo text-lfo"
                : "bg-transparent border-border-default text-text-muted"
            }`}
            style={
              lfo.shape === Number(s.value)
                ? { backgroundColor: "rgba(136,68,255,0.15)" }
                : undefined
            }
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-center gap-2">
        <Knob
          label="Rate"
          value={lfo.rate}
          min={0.01}
          max={20}
          step={0.01}
          onChange={(v) => (synthState.lfos[index].rate = v)}
          color="var(--lfo)"
          formatValue={(v) => `${v.toFixed(2)}Hz`}
        />
        <div
          ref={dragRef as unknown as React.Ref<HTMLDivElement>}
          className="flex flex-col items-center gap-0.5 cursor-grab active:cursor-grabbing select-none transition-opacity"
          style={{ opacity: isDragging ? 0.4 : 1 }}
          title={`Drag to assign ${label} modulation`}
        >
          <GripHorizontal size={16} className="text-lfo" />
          <span className="text-[8px] text-lfo uppercase tracking-wider">MOD</span>
        </div>
      </div>
    </Panel>
  );
}
