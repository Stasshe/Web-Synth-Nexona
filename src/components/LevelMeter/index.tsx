"use client";
import { useCallback, useEffect, useRef } from "react";

interface LevelMeterProps {
  peakL: number;
  peakR: number;
}

export function LevelMeter({ peakL, peakR }: LevelMeterProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const smoothL = useRef(0);
  const smoothR = useRef(0);
  const peakHoldL = useRef(0);
  const peakHoldR = useRef(0);
  const peakDecayL = useRef(0);
  const peakDecayR = useRef(0);
  const latestL = useRef(0);
  const latestR = useRef(0);

  useEffect(() => {
    latestL.current = peakL;
    latestR.current = peakR;
  }, [peakL, peakR]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      rafRef.current = requestAnimationFrame(draw);
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      rafRef.current = requestAnimationFrame(draw);
      return;
    }

    const w = canvas.width;
    const h = canvas.height;

    // Smoothing
    const attackCoeff = 0.3;
    const releaseCoeff = 0.05;
    const pL = latestL.current;
    const pR = latestR.current;
    smoothL.current += (pL > smoothL.current ? attackCoeff : releaseCoeff) * (pL - smoothL.current);
    smoothR.current += (pR > smoothR.current ? attackCoeff : releaseCoeff) * (pR - smoothR.current);

    // Peak hold
    if (smoothL.current > peakHoldL.current) { peakHoldL.current = smoothL.current; peakDecayL.current = 60; }
    if (smoothR.current > peakHoldR.current) { peakHoldR.current = smoothR.current; peakDecayR.current = 60; }
    peakDecayL.current--;
    peakDecayR.current--;
    if (peakDecayL.current <= 0) peakHoldL.current *= 0.95;
    if (peakDecayR.current <= 0) peakHoldR.current *= 0.95;

    ctx.fillStyle = "#0d0d14";
    ctx.fillRect(0, 0, w, h);

    const barWidth = 5;
    const gap = 2;
    const totalWidth = barWidth * 2 + gap;
    const xStart = (w - totalWidth) / 2;

    const drawBar = (x: number, level: number, peakLevel: number) => {
      // Convert to dB, map -60..0 to 0..1
      const db = level > 1e-6 ? 20 * Math.log10(level) : -60;
      const norm = Math.max(0, Math.min(1, (db + 60) / 60));
      const barH = norm * h;

      // Gradient: green (bottom) → yellow → red (top)
      const grad = ctx.createLinearGradient(x, h, x, 0);
      grad.addColorStop(0, "#22cc55");
      grad.addColorStop(0.6, "#22cc55");
      grad.addColorStop(0.8, "#eab308");
      grad.addColorStop(1, "#ef4444");
      ctx.fillStyle = grad;
      ctx.fillRect(x, h - barH, barWidth, barH);

      // Peak hold indicator
      const peakDb = peakLevel > 1e-6 ? 20 * Math.log10(peakLevel) : -60;
      const peakNorm = Math.max(0, Math.min(1, (peakDb + 60) / 60));
      if (peakNorm > 0.01) {
        const peakY = h - peakNorm * h;
        ctx.fillStyle = peakDb > -3 ? "#ef4444" : peakDb > -12 ? "#eab308" : "#44ff88";
        ctx.fillRect(x, peakY, barWidth, 1);
      }
    };

    drawBar(xStart, smoothL.current, peakHoldL.current);
    drawBar(xStart + barWidth + gap, smoothR.current, peakHoldR.current);

    rafRef.current = requestAnimationFrame(draw);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      width={16}
      height={32}
      className="w-[16px] h-[32px] rounded border border-border-default"
    />
  );
}
