"use client";
import { useCallback, useEffect, useRef } from "react";

interface VisualizerProps {
  waveformData: Float32Array | null;
}

export function Visualizer({ waveformData }: VisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bufferRef = useRef(new Float32Array(512));
  const writePos = useRef(0);
  const rafRef = useRef(0);
  const latestData = useRef<Float32Array | null>(null);

  // Accumulate waveform data into a larger ring buffer
  useEffect(() => {
    if (!waveformData || waveformData.length === 0) return;
    latestData.current = waveformData;
    const buf = bufferRef.current;
    const len = waveformData.length;
    for (let i = 0; i < len; i++) {
      buf[(writePos.current + i) % buf.length] = waveformData[i];
    }
    writePos.current = (writePos.current + len) % buf.length;
  }, [waveformData]);

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
    for (let i = 1; i < 4; i++) {
      const x = (w * i) / 4;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    const buf = bufferRef.current;
    if (!latestData.current) {
      rafRef.current = requestAnimationFrame(draw);
      return;
    }

    // Read the last 512 samples in buffer order
    const totalSamples = buf.length;
    const readStart = writePos.current;

    // Find best trigger point: rising zero-crossing with hysteresis
    const hysteresis = 0.01;
    let triggerIdx = 0;
    let bestTrigger = -1;
    let bestScore = Number.MAX_VALUE;

    for (let i = 1; i < totalSamples - 128; i++) {
      const idx0 = (readStart + i - 1) % totalSamples;
      const idx1 = (readStart + i) % totalSamples;
      const prev = buf[idx0];
      const curr = buf[idx1];
      if (prev <= -hysteresis && curr > hysteresis) {
        // Score by how close to zero the crossing is
        const score = Math.abs(curr) + Math.abs(prev);
        if (score < bestScore) {
          bestScore = score;
          bestTrigger = i;
        }
      }
    }
    triggerIdx = bestTrigger >= 0 ? bestTrigger : 0;

    // Auto-scale: find peak amplitude in the display window
    const samplesToShow = 128;
    let peak = 0;
    for (let i = 0; i < samplesToShow; i++) {
      const idx = (readStart + triggerIdx + i) % totalSamples;
      const abs = Math.abs(buf[idx]);
      if (abs > peak) peak = abs;
    }
    const scale = peak > 0.001 ? 0.85 / peak : 1;

    // Draw waveform
    ctx.strokeStyle = "#44ff88";
    ctx.lineWidth = 1.5;
    ctx.shadowColor = "#44ff88";
    ctx.shadowBlur = 6;
    ctx.beginPath();

    for (let i = 0; i < samplesToShow; i++) {
      const x = (i / samplesToShow) * w;
      const idx = (readStart + triggerIdx + i) % totalSamples;
      const sample = buf[idx];
      const y = h / 2 - sample * scale * (h / 2);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    rafRef.current = requestAnimationFrame(draw);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      width={180}
      height={32}
      className="w-[180px] h-[32px] rounded border border-border-default"
    />
  );
}
