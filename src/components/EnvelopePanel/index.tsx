"use client";
import { Panel } from "@/components/ui/Panel";
import { synthState } from "@/state/synthState";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSnapshot } from "valtio";

type EnvType = "amp" | "filter";

export function EnvelopePanel() {
  const snap = useSnapshot(synthState);
  const [activeEnv, setActiveEnv] = useState<EnvType>("amp");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const env = snap.envelopes[activeEnv];

  const color = activeEnv === "amp" ? "var(--env-amp)" : "var(--env-filter)";

  const drawEnvelope = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const pad = 8;

    ctx.clearRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = "#2a2a45";
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = pad + ((h - pad * 2) * i) / 4;
      ctx.beginPath();
      ctx.moveTo(pad, y);
      ctx.lineTo(w - pad, y);
      ctx.stroke();
    }

    // Envelope curve
    const totalTime = env.attack + env.decay + 0.3 + env.release;
    const timeToX = (t: number) => pad + (t / totalTime) * (w - pad * 2);
    const levelToY = (l: number) => h - pad - l * (h - pad * 2);

    const strokeColor = activeEnv === "amp" ? "#44ff88" : "#ff4466";
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(timeToX(0), levelToY(0));
    ctx.lineTo(timeToX(env.attack), levelToY(1));
    ctx.lineTo(timeToX(env.attack + env.decay), levelToY(env.sustain));
    ctx.lineTo(timeToX(env.attack + env.decay + 0.3), levelToY(env.sustain));
    ctx.lineTo(timeToX(totalTime), levelToY(0));
    ctx.stroke();

    // Fill under curve
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = strokeColor;
    ctx.lineTo(timeToX(totalTime), levelToY(0));
    ctx.lineTo(timeToX(0), levelToY(0));
    ctx.fill();
    ctx.globalAlpha = 1;

    // Control points
    const points = [
      { x: timeToX(env.attack), y: levelToY(1) },
      { x: timeToX(env.attack + env.decay), y: levelToY(env.sustain) },
      { x: timeToX(env.attack + env.decay + 0.3), y: levelToY(env.sustain) },
      { x: timeToX(totalTime), y: levelToY(0) },
    ];

    for (const p of points) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = strokeColor;
      ctx.fill();
    }
  }, [env, activeEnv]);

  useEffect(() => {
    drawEnvelope();
  }, [drawEnvelope]);

  const handleChange = (param: "attack" | "decay" | "sustain" | "release", value: number) => {
    synthState.envelopes[activeEnv][param] = value;
  };

  return (
    <Panel title="ENVELOPE" color={color}>
      <div className="flex gap-1 mb-2">
        <button
          type="button"
          onClick={() => setActiveEnv("amp")}
          className={`flex-1 text-[10px] py-1 rounded border transition-colors ${
            activeEnv === "amp"
              ? "border-env-amp text-env-amp"
              : "bg-transparent border-border-default text-text-muted"
          }`}
          style={activeEnv === "amp" ? { backgroundColor: "rgba(68,255,136,0.15)" } : undefined}
        >
          AMP
        </button>
        <button
          type="button"
          onClick={() => setActiveEnv("filter")}
          className={`flex-1 text-[10px] py-1 rounded border transition-colors ${
            activeEnv === "filter"
              ? "border-env-filter text-env-filter"
              : "bg-transparent border-border-default text-text-muted"
          }`}
          style={activeEnv === "filter" ? { backgroundColor: "rgba(255,68,102,0.15)" } : undefined}
        >
          FILTER
        </button>
      </div>

      <canvas
        ref={canvasRef}
        width={280}
        height={70}
        className="w-full h-[70px] rounded bg-bg-dark mb-2"
      />

      <div className="grid grid-cols-4 gap-1">
        {(["attack", "decay", "sustain", "release"] as const).map((p) => (
          <div key={p} className="flex flex-col items-center gap-0.5">
            <input
              type="range"
              min={p === "sustain" ? 0 : 0.001}
              max={p === "sustain" ? 1 : 5}
              step={p === "sustain" ? 0.01 : 0.001}
              value={env[p]}
              onChange={(e) => handleChange(p, Number(e.target.value))}
              className="w-full"
            />
            <span className="text-[9px] text-text-muted uppercase">{p[0]}</span>
            <span className="text-[9px] text-text-secondary">
              {p === "sustain"
                ? `${(env[p] * 100).toFixed(0)}%`
                : `${(env[p] * 1000).toFixed(0)}ms`}
            </span>
          </div>
        ))}
      </div>
    </Panel>
  );
}
