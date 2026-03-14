"use client";
import { useCallback, useEffect, useRef } from "react";
import {
  svfNotchResponseDb,
  svfResponseDb,
  svfResponseDb24,
} from "@/audio/dsp/filter/svf";

interface FilterResponseGraphProps {
  modelIndex: number;
  style: number;
  cutoff: number;
  resonance: number;
  blend: number;
  color: string;
  onCutoffChange: (hz: number) => void;
  onResonanceChange: (r: number) => void;
  width?: number;
  height?: number;
}

const SR = 44100;
const FREQ_MIN = 20;
const FREQ_MAX = 20000;
const DB_MIN = -60;
const DB_MAX = 18;
const NUM_POINTS = 256;

function freqToX(f: number): number {
  return (Math.log2(f) - Math.log2(FREQ_MIN)) / (Math.log2(FREQ_MAX) - Math.log2(FREQ_MIN));
}

function xToFreq(x: number): number {
  return FREQ_MIN * Math.pow(FREQ_MAX / FREQ_MIN, x);
}

function dbToY(db: number): number {
  return 1 - (db - DB_MIN) / (DB_MAX - DB_MIN);
}

function computeResponseDb(
  freqHz: number,
  modelIndex: number,
  st: number,
  cutoff: number,
  resonance: number,
  blend: number,
): number {
  switch (modelIndex) {
    case 0:
    case 1:
    case 3:
      if (st === 1) return svfResponseDb24(freqHz, cutoff, resonance, blend, SR);
      if (st === 2) return svfNotchResponseDb(freqHz, cutoff, resonance, blend, SR);
      return svfResponseDb(freqHz, cutoff, resonance, blend, SR);

    case 2:
    case 4: {
      const db12 = svfResponseDb(freqHz, cutoff, resonance * 0.7, blend, SR);
      return st === 0 ? db12 * 2 : db12;
    }

    case 5: {
      const formantFreqs = interpolateFormantFreqs(cutoff, blend, st);
      let power = 0;
      const q = 0.55 + resonance * 0.35;
      const weights = [1.0, 0.64, 0.3, 0.12];
      for (let b = 0; b < formantFreqs.length; b++) {
        const db = svfResponseDb(freqHz, formantFreqs[b], q * 0.85, 0, SR);
        power += weights[b] * Math.pow(10, db / 10);
      }
      return power > 0 ? 10 * Math.log10(power) : -120;
    }

    case 6: {
      const period = 1 / Math.max(cutoff, 20);
      const delaySamples = period * SR;
      const fb = resonance * 0.97;
      const phase = (2 * Math.PI * freqHz * delaySamples) / SR;
      const re = 1 + fb * Math.cos(phase);
      const im = fb * Math.sin(phase);
      const mag = Math.sqrt(re * re + im * im);
      return 20 * Math.log10(Math.max(mag, 1e-6));
    }

    case 7: {
      let re = 1, im = 0;
      for (let i = 0; i < 8; i++) {
        const spread = Math.pow(2, (i - 3.5) * 0.25);
        const fc = Math.min(cutoff * spread, SR * 0.45);
        const g = Math.tan((Math.PI * fc) / SR);
        const a = (g - 1) / (g + 1);
        const w = (2 * Math.PI * freqHz) / SR;
        const cosCW = Math.cos(w);
        const sinCW = Math.sin(w);
        const numRe = a + cosCW;
        const numIm = -sinCW;
        const denRe = 1 + a * cosCW;
        const denIm = -a * sinCW;
        const den2 = denRe * denRe + denIm * denIm;
        const stageRe = (numRe * denRe + numIm * denIm) / den2;
        const stageIm = (numIm * denRe - numRe * denIm) / den2;
        const newRe = re * stageRe - im * stageIm;
        const newIm = re * stageIm + im * stageRe;
        re = newRe;
        im = newIm;
      }
      const invertMult = st === 0 ? 1 : -1;
      const outRe = (1 + invertMult * re) * 0.5;
      const outIm = (invertMult * im) * 0.5;
      const wet = (blend + 1) * 0.5;
      const mixRe = (1 - wet) + wet * outRe;
      const mixIm = wet * outIm;
      const mag = Math.sqrt(mixRe * mixRe + mixIm * mixIm);
      return 20 * Math.log10(Math.max(mag, 1e-6));
    }

    default:
      return svfResponseDb(freqHz, cutoff, resonance, blend, SR);
  }
}

const VOWELS_AOIE: number[][] = [
  [800, 1150, 2900, 3400],
  [500, 1000, 2800, 3300],
  [300,  900, 2200, 3100],
  [280, 2250, 2900, 3400],
  [400, 2200, 2600, 3300],
];
const VOWELS_AIUO: number[][] = [
  [800, 1150, 2900, 3400],
  [280, 2250, 2900, 3400],
  [300,  900, 2200, 3100],
  [500, 1000, 2800, 3300],
];

function interpolateFormantFreqs(cutoff: number, blend: number, style: number): number[] {
  const vowels = style === 1 ? VOWELS_AIUO : VOWELS_AOIE;
  const n = vowels.length;
  const tBase =
    ((Math.log2(Math.max(cutoff, 20)) - Math.log2(20)) / (Math.log2(20000) - Math.log2(20))) *
    (n - 1);
  const t = Math.max(0, Math.min(n - 1, tBase + blend * 0.5));
  const i = Math.min(Math.floor(t), n - 2);
  const frac = t - i;
  return vowels[i].map((f, b) => f + (vowels[i + 1][b] - f) * frac);
}

export function FilterResponseGraph({
  modelIndex,
  style,
  cutoff,
  resonance,
  blend,
  color,
  onCutoffChange,
  onResonanceChange,
  width = 240,
  height = 80,
}: FilterResponseGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, cutoff: 0, resonance: 0 });

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(typeof window !== "undefined" ? window.devicePixelRatio : 1, 2);
    const W = width;
    const H = height;
    if (canvas.width !== W * dpr || canvas.height !== H * dpr) {
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = W + "px";
      canvas.style.height = H + "px";
      ctx.scale(dpr, dpr);
    }
    ctx.clearRect(0, 0, W, H);

    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 1;
    for (const db of [0, -12, -24, -36]) {
      const y = dbToY(db) * H;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    for (const freq of [100, 500, 1000, 5000, 10000]) {
      const x = freqToX(freq) * W;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }

    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    const y0 = dbToY(0) * H;
    ctx.moveTo(0, y0);
    ctx.lineTo(W, y0);
    ctx.stroke();

    const pts: [number, number][] = [];
    for (let i = 0; i < NUM_POINTS; i++) {
      const t = i / (NUM_POINTS - 1);
      const freq = xToFreq(t);
      const db = computeResponseDb(freq, modelIndex, style, cutoff, resonance, blend);
      const px = t * W;
      const py = Math.max(0, Math.min(H, dbToY(db) * H));
      pts.push([px, py]);
    }

    const toHsla = (c: string, a: number) =>
      c.startsWith("hsl(")
        ? c.replace("hsl(", "hsla(").replace(")", `, ${a})`)
        : `rgba(100,160,255,${a})`;

    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, toHsla(color, 0.45));
    grad.addColorStop(0.6, toHsla(color, 0.15));
    grad.addColorStop(1, toHsla(color, 0.0));

    ctx.beginPath();
    ctx.moveTo(pts[0][0], H);
    ctx.lineTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i][0], pts[i][1]);
    }
    ctx.lineTo(pts[pts.length - 1][0], H);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i][0], pts[i][1]);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const cx = freqToX(cutoff) * W;
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, H);
    ctx.stroke();
    ctx.setLineDash([]);

    const peakDb = computeResponseDb(cutoff, modelIndex, style, cutoff, resonance, blend);
    const dotY = Math.max(4, Math.min(H - 4, dbToY(peakDb) * H));
    ctx.beginPath();
    ctx.arc(cx, dotY, 3, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.fill();

  }, [modelIndex, style, cutoff, resonance, blend, color, width, height]);

  useEffect(() => {
    draw();
  }, [draw]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      dragging.current = true;
      dragStart.current = { x: e.clientX, y: e.clientY, cutoff, resonance };
    },
    [cutoff, resonance],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!dragging.current) return;
      const dx = (e.clientX - dragStart.current.x) / width;
      const dy = (e.clientY - dragStart.current.y) / height;
      const newCutoff = Math.min(
        20000,
        Math.max(20, dragStart.current.cutoff * Math.pow(FREQ_MAX / FREQ_MIN, dx)),
      );
      const newReso = Math.min(0.99, Math.max(0, dragStart.current.resonance - dy * 1.5));
      onCutoffChange(newCutoff);
      onResonanceChange(newReso);
    },
    [width, height, onCutoffChange, onResonanceChange],
  );

  const handlePointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="w-full rounded cursor-crosshair touch-none"
      style={{ display: "block" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    />
  );
}
