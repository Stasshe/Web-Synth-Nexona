"use client";
import { ModSource } from "@/audio/dsp/modulation/modMatrix";
import { Knob } from "@/components/ui/Knob";
import { Panel } from "@/components/ui/Panel";
import { DND_TYPES, type ModSourceDragItem } from "@/dnd/types";
import { modFeedbackState } from "@/state/modFeedback";
import { synthState } from "@/state/synthState";
import { GripHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useDrag } from "react-dnd";
import { useSnapshot } from "valtio";

type EnvType = "amp" | "filter";

const CANVAS_W = 200;
const CANVAS_H = 60;

interface EnvParams {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

function drawEnvCanvas(
  canvas: HTMLCanvasElement,
  env: EnvParams,
  strokeColor: string,
  envLevel: number,
  envState: number,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;
  const pad = 6;

  ctx.fillStyle = "#0d0d14";
  ctx.fillRect(0, 0, w, h);

  // Baseline
  ctx.strokeStyle = "#2a2a45";
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(pad, h - pad);
  ctx.lineTo(w - pad, h - pad);
  ctx.stroke();

  const sustainWidth = Math.max(env.attack + env.decay, 0.3) * 0.3;
  const totalTime = env.attack + env.decay + sustainWidth + env.release;
  const timeToX = (t: number) => pad + (t / totalTime) * (w - pad * 2);
  const levelToY = (l: number) => h - pad - l * (h - pad * 2);

  const x0 = timeToX(0);
  const xA = timeToX(env.attack);
  const xD = timeToX(env.attack + env.decay);
  const xS = timeToX(env.attack + env.decay + sustainWidth);
  const xR = timeToX(totalTime);
  const yBot = levelToY(0);
  const yTop = levelToY(1);
  const ySus = levelToY(env.sustain);

  // Fill under curve
  ctx.beginPath();
  ctx.moveTo(x0, yBot);
  ctx.lineTo(xA, yTop);
  ctx.lineTo(xD, ySus);
  ctx.lineTo(xS, ySus);
  ctx.lineTo(xR, yBot);
  ctx.closePath();
  ctx.fillStyle = `${strokeColor}18`;
  ctx.fill();

  // Curve
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x0, yBot);
  ctx.lineTo(xA, yTop);
  ctx.lineTo(xD, ySus);
  ctx.lineTo(xS, ySus);
  ctx.lineTo(xR, yBot);
  ctx.stroke();

  // Control point dots
  for (const { x, y } of [
    { x: xA, y: yTop },
    { x: xD, y: ySus },
    { x: xS, y: ySus },
    { x: xR, y: yBot },
  ]) {
    ctx.beginPath();
    ctx.arc(x, y, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = strokeColor;
    ctx.fill();
  }

  // Live position indicator
  if (envState > 0) {
    let posX = pad;
    const lvl = envLevel;
    if (envState === 1) {
      posX = timeToX(lvl * env.attack);
    } else if (envState === 2) {
      const t = env.sustain < 1 ? (1 - lvl) / (1 - env.sustain) : 1;
      posX = timeToX(env.attack + Math.min(1, t) * env.decay);
    } else if (envState === 3) {
      posX = timeToX(env.attack + env.decay + sustainWidth * 0.5);
    } else if (envState === 4) {
      const t = env.sustain > 0 ? 1 - lvl / env.sustain : 1;
      posX = timeToX(env.attack + env.decay + sustainWidth + Math.min(1, t) * env.release);
    }
    const posY = levelToY(lvl);
    ctx.strokeStyle = `${strokeColor}60`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(posX, 0);
    ctx.lineTo(posX, h);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(posX, posY, 4, 0, Math.PI * 2);
    ctx.fillStyle = strokeColor;
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

const fmtTime = (v: number) => (v < 1 ? `${(v * 1000).toFixed(0)}ms` : `${v.toFixed(2)}s`);
const fmtPct = (v: number) => `${(v * 100).toFixed(0)}%`;

export function EnvelopePanel() {
  const snap = useSnapshot(synthState);
  const fb = useSnapshot(modFeedbackState);
  const [activeEnv, setActiveEnv] = useState<EnvType>("amp");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const env = snap.envelopes[activeEnv];
  const color = activeEnv === "amp" ? "var(--env-amp)" : "var(--env-filter)";
  const strokeColor = activeEnv === "amp" ? "#44ff88" : "#ff4466";
  const modSource = activeEnv === "amp" ? ModSource.AMP_ENV : ModSource.FILTER_ENV;
  const modLabel = activeEnv === "amp" ? "Env 1" : "Env 2";
  const envLevel = activeEnv === "amp" ? fb.envAmpLevel : fb.envFilterLevel;
  const envState = activeEnv === "amp" ? fb.envAmpState : fb.envFilterState;

  const [{ isDragging }, dragRef] = useDrag(
    () => ({
      type: DND_TYPES.MOD_SOURCE,
      item: { source: modSource, label: modLabel } as ModSourceDragItem,
      collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    }),
    [modSource, modLabel],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawEnvCanvas(canvas, synthState.envelopes[activeEnv], strokeColor, envLevel, envState);
  }, [env, activeEnv, strokeColor, envLevel, envState]);

  return (
    <Panel title="ENVELOPE" color={color}>
      {/* ENV 1 / ENV 2 tab selector */}
      <div className="flex gap-0.5 mb-1.5 p-0.5 bg-bg-dark rounded">
        {(["amp", "filter"] as const).map((e, i) => (
          <button
            key={e}
            type="button"
            onClick={() => setActiveEnv(e)}
            className={`flex-1 text-[10px] py-0.5 rounded font-medium transition-colors border ${
              activeEnv === e
                ? e === "amp"
                  ? "bg-env-amp/15 text-env-amp border-env-amp/40"
                  : "bg-env-filter/15 text-env-filter border-env-filter/40"
                : "text-text-muted border-transparent hover:text-text-primary"
            }`}
          >
            ENV {i + 1}
          </button>
        ))}
      </div>

      {/* Envelope shape preview */}
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        className="w-full rounded mb-2"
        style={{ height: `${CANVAS_H}px`, backgroundColor: "#0d0d14" }}
      />

      {/* ADSR knobs */}
      <div className="flex justify-around items-start mb-1.5">
        {(
          [
            { key: "attack", label: "A", min: 0.001, max: 5, step: 0.001, fmt: fmtTime },
            { key: "decay", label: "D", min: 0.001, max: 5, step: 0.001, fmt: fmtTime },
            { key: "sustain", label: "S", min: 0, max: 1, step: 0.01, fmt: fmtPct },
            { key: "release", label: "R", min: 0.001, max: 5, step: 0.001, fmt: fmtTime },
          ] as const
        ).map(({ key, label, min, max, step, fmt }) => (
          <Knob
            key={key}
            label={label}
            value={env[key]}
            min={min}
            max={max}
            step={step}
            onChange={(v) => {
              synthState.envelopes[activeEnv][key] = v;
            }}
            size={40}
            color={color}
            formatValue={fmt}
          />
        ))}
      </div>

      {/* MOD drag handle */}
      <div className="flex justify-end">
        <div
          ref={dragRef as unknown as React.Ref<HTMLDivElement>}
          className="flex flex-col items-center gap-0.5 cursor-grab active:cursor-grabbing select-none transition-opacity"
          style={{ opacity: isDragging ? 0.4 : 1 }}
          title={`Drag to assign ${modLabel} modulation`}
        >
          <GripHorizontal size={14} style={{ color }} />
          <span className="text-[8px] uppercase tracking-wider" style={{ color }}>
            MOD
          </span>
        </div>
      </div>
    </Panel>
  );
}
