"use client";
import { useCallback, useEffect, useRef } from "react";

interface VisualizerProps {
  waveformData: Float32Array | null;
}

export function Visualizer({ waveformData }: VisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.fillStyle = "#0d0d14";
    ctx.fillRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = "#1a1a2e";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();
    for (let i = 0; i < 4; i++) {
      const x = (w * (i + 1)) / 4;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    if (!waveformData || waveformData.length === 0) return;

    // Find trigger point (zero crossing, rising)
    let triggerIdx = 0;
    for (let i = 1; i < waveformData.length - 1; i++) {
      if (waveformData[i - 1] <= 0 && waveformData[i] > 0) {
        triggerIdx = i;
        break;
      }
    }

    // Draw waveform
    ctx.strokeStyle = "#44ff88";
    ctx.lineWidth = 2;
    ctx.shadowColor = "#44ff88";
    ctx.shadowBlur = 8;
    ctx.beginPath();

    const samplesAvailable = waveformData.length - triggerIdx;
    const samplesToShow = Math.min(samplesAvailable, 96);

    for (let i = 0; i < samplesToShow; i++) {
      const x = (i / samplesToShow) * w;
      const sample = waveformData[triggerIdx + i] ?? 0;
      const y = h / 2 - sample * (h / 2) * 0.8;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
  }, [waveformData]);

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      width={160}
      height={28}
      className="w-[160px] h-[28px] rounded border border-border-default"
    />
  );
}
