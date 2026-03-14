"use client";
import { modFeedbackState } from "@/state/modFeedback";
import { synthState } from "@/state/synthState";
import { useCallback, useEffect, useRef } from "react";
import { useSnapshot } from "valtio";

interface CompressorGraphProps {
  threshold: number;
  ratio: number;
  knee: number;
  gainReduction: number;
}

export function CompressorGraph({ threshold, ratio, knee, gainReduction }: CompressorGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const smoothGR = useRef(0);
  const latestGR = useRef(0);

  useEffect(() => {
    latestGR.current = gainReduction;
  }, [gainReduction]);

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

    // Smooth GR for meter
    const gr = latestGR.current;
    const coeff = gr > smoothGR.current ? 0.3 : 0.06;
    smoothGR.current += coeff * (gr - smoothGR.current);
    if (smoothGR.current < 0.01) smoothGR.current = 0;

    // Background
    ctx.fillStyle = "#0d0d14";
    ctx.fillRect(0, 0, w, h);

    const graphSize = Math.min(w - 28, h - 4);
    const gx = 2;
    const gy = 2;
    const gw = graphSize;
    const gh = graphSize;

    // Graph background
    ctx.fillStyle = "#12121e";
    ctx.fillRect(gx, gy, gw, gh);

    // Grid lines (subtle)
    ctx.strokeStyle = "#1a1a2e";
    ctx.lineWidth = 0.5;
    const dbMin = -60;
    const dbMax = 0;
    const dbRange = dbMax - dbMin;
    const gridDbs = [-48, -36, -24, -12];
    for (const db of gridDbs) {
      const nx = (db - dbMin) / dbRange;
      const ny = 1 - nx;
      // Vertical
      ctx.beginPath();
      ctx.moveTo(gx + nx * gw, gy);
      ctx.lineTo(gx + nx * gw, gy + gh);
      ctx.stroke();
      // Horizontal
      ctx.beginPath();
      ctx.moveTo(gx, gy + ny * gh);
      ctx.lineTo(gx + gw, gy + ny * gh);
      ctx.stroke();
    }

    // 1:1 reference line (dashed)
    ctx.strokeStyle = "#2a2a45";
    ctx.lineWidth = 0.5;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(gx, gy + gh);
    ctx.lineTo(gx + gw, gy);
    ctx.stroke();
    ctx.setLineDash([]);

    // Compression curve
    const halfKnee = knee * 0.5;
    ctx.strokeStyle = "#ff6644";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let px = 0; px <= gw; px++) {
      const inputDb = dbMin + (px / gw) * dbRange;
      let outputDb: number;

      if (knee < 0.1) {
        // Hard knee
        if (inputDb <= threshold) {
          outputDb = inputDb;
        } else {
          const excess = inputDb - threshold;
          outputDb = threshold + excess / ratio;
        }
      } else if (inputDb <= threshold - halfKnee) {
        outputDb = inputDb;
      } else if (inputDb >= threshold + halfKnee) {
        const excess = inputDb - threshold;
        outputDb = threshold + excess / ratio;
      } else {
        // Soft knee interpolation
        const x = inputDb - threshold + halfKnee;
        const reductionDb = ((1 - 1 / ratio) * x * x) / (2 * knee);
        outputDb = inputDb - reductionDb;
      }

      const ox = gx + px;
      const oy = gy + (1 - (outputDb - dbMin) / dbRange) * gh;
      if (px === 0) ctx.moveTo(ox, Math.max(gy, Math.min(gy + gh, oy)));
      else ctx.lineTo(ox, Math.max(gy, Math.min(gy + gh, oy)));
    }
    ctx.stroke();

    // Threshold indicator line
    const threshNorm = (threshold - dbMin) / dbRange;
    ctx.strokeStyle = "rgba(255, 102, 68, 0.3)";
    ctx.lineWidth = 0.5;
    ctx.setLineDash([2, 3]);
    // Vertical at threshold
    ctx.beginPath();
    ctx.moveTo(gx + threshNorm * gw, gy);
    ctx.lineTo(gx + threshNorm * gw, gy + gh);
    ctx.stroke();
    ctx.setLineDash([]);

    // Threshold label
    ctx.fillStyle = "rgba(255, 102, 68, 0.6)";
    ctx.font = "7px monospace";
    ctx.fillText(`${threshold.toFixed(0)}`, gx + threshNorm * gw + 2, gy + 8);

    // GR meter (vertical bar on the right side)
    const meterX = gx + gw + 4;
    const meterW = 8;
    const meterH = gh;
    const meterY = gy;

    // GR meter background
    ctx.fillStyle = "#12121e";
    ctx.fillRect(meterX, meterY, meterW, meterH);

    // GR bar (grows downward from top — 0dB at top, more reduction downward)
    const maxGR = 30; // max display range in dB
    const grNorm = Math.min(1, smoothGR.current / maxGR);
    const grBarH = grNorm * meterH;

    if (grBarH > 0.5) {
      const grGrad = ctx.createLinearGradient(meterX, meterY, meterX, meterY + meterH);
      grGrad.addColorStop(0, "#ff6644");
      grGrad.addColorStop(0.5, "#ff4422");
      grGrad.addColorStop(1, "#cc2200");
      ctx.fillStyle = grGrad;
      ctx.fillRect(meterX, meterY, meterW, grBarH);
    }

    // GR border
    ctx.strokeStyle = "#2a2a45";
    ctx.lineWidth = 0.5;
    ctx.strokeRect(meterX, meterY, meterW, meterH);

    // GR value text
    if (smoothGR.current > 0.1) {
      ctx.fillStyle = "#ff6644";
      ctx.font = "7px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`-${smoothGR.current.toFixed(0)}`, meterX + meterW / 2, meterY + meterH + 9);
      ctx.textAlign = "left";
    }

    // Graph border
    ctx.strokeStyle = "#2a2a45";
    ctx.lineWidth = 0.5;
    ctx.strokeRect(gx, gy, gw, gh);

    rafRef.current = requestAnimationFrame(draw);
  }, [threshold, ratio, knee]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      width={92}
      height={68}
      className="w-[92px] h-[68px] rounded shrink-0"
    />
  );
}
