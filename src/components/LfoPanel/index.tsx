"use client";
import { Knob } from "@/components/ui/Knob";
import { Panel } from "@/components/ui/Panel";
import { synthState } from "@/state/synthState";
import { useCallback, useEffect, useRef } from "react";
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
  const lfo = snap.lfos[index];
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const label = index === "lfo1" ? "LFO 1" : "LFO 2";

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

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
      const phase = x / w;
      let y = 0;
      switch (lfo.shape) {
        case 0: // Sine
          y = Math.sin(2 * Math.PI * phase);
          break;
        case 1: // Triangle
          if (phase < 0.25) y = phase * 4;
          else if (phase < 0.75) y = 2 - phase * 4;
          else y = phase * 4 - 4;
          break;
        case 2: // Square
          y = phase < 0.5 ? 1 : -1;
          break;
        case 3: // Random (show stepped)
          y = Math.sin(2 * Math.PI * phase * 3) > 0 ? 0.6 : -0.4;
          break;
      }
      const py = h / 2 - (y * (h - 16)) / 2;
      if (x === 0) ctx.moveTo(x, py);
      else ctx.lineTo(x, py);
    }
    ctx.stroke();
  }, [lfo.shape]);

  useEffect(() => {
    drawWaveform();
  }, [drawWaveform]);

  return (
    <Panel title={label} color="var(--lfo)">
      <canvas
        ref={canvasRef}
        width={200}
        height={50}
        className="w-full h-[50px] rounded bg-bg-dark mb-2"
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

      <div className="flex justify-center">
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
      </div>
    </Panel>
  );
}
