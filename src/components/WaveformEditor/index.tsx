"use client";

import type { Wavetable } from "@/audio/dsp/wavetable/wavetableEngine";
import { useCallback, useEffect, useRef, useState } from "react";

const TABLE_SIZE = 2048;
const CANVAS_W = 600;
const CANVAS_H = 240;

interface WaveformEditorProps {
  open: boolean;
  onClose: () => void;
  onApply: (wt: Wavetable) => void;
  osc: "a" | "b";
}

function createDefaultWaveform(): Float32Array {
  const data = new Float32Array(TABLE_SIZE + 1);
  for (let i = 0; i <= TABLE_SIZE; i++) {
    data[i] = Math.sin((2 * Math.PI * i) / TABLE_SIZE);
  }
  return data;
}

export function WaveformEditor({ open, onClose, onApply, osc }: WaveformEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [waveform, setWaveform] = useState<Float32Array>(() => createDefaultWaveform());
  const drawingRef = useRef(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = CANVAS_W;
    const h = CANVAS_H;

    // Background
    ctx.fillStyle = "#0d0d14";
    ctx.fillRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = "#1a1a2e";
    ctx.lineWidth = 0.5;
    // Center line
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();
    // Quarter lines
    ctx.beginPath();
    ctx.moveTo(0, h / 4);
    ctx.lineTo(w, h / 4);
    ctx.moveTo(0, (3 * h) / 4);
    ctx.lineTo(w, (3 * h) / 4);
    ctx.stroke();
    // Vertical lines
    for (let i = 1; i < 8; i++) {
      ctx.beginPath();
      ctx.moveTo((w * i) / 8, 0);
      ctx.lineTo((w * i) / 8, h);
      ctx.stroke();
    }

    // Waveform
    const color = osc === "a" ? "#4488ff" : "#ff8844";
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.shadowColor = color;
    ctx.shadowBlur = 4;
    ctx.beginPath();

    for (let x = 0; x < w; x++) {
      const idx = Math.floor((x / w) * TABLE_SIZE);
      const val = waveform[idx] ?? 0;
      const y = h / 2 - val * (h / 2 - 4);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Fill under curve
    ctx.globalAlpha = 0.05;
    ctx.fillStyle = color;
    ctx.lineTo(w, h / 2);
    ctx.lineTo(0, h / 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }, [waveform, osc]);

  useEffect(() => {
    if (open) draw();
  }, [open, draw]);

  const posToWaveform = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const x = (clientX - rect.left) * (CANVAS_W / rect.width);
      const y = (clientY - rect.top) * (CANVAS_H / rect.height);
      const idx = Math.floor((x / CANVAS_W) * TABLE_SIZE);
      const val = -((y - CANVAS_H / 2) / (CANVAS_H / 2 - 4));
      return { idx: Math.max(0, Math.min(TABLE_SIZE, idx)), val: Math.max(-1, Math.min(1, val)) };
    },
    [],
  );

  const interpolateDraw = useCallback(
    (from: { x: number; y: number }, to: { x: number; y: number }) => {
      const p1 = posToWaveform(from.x, from.y);
      const p2 = posToWaveform(to.x, to.y);
      if (!p1 || !p2) return;

      setWaveform((prev) => {
        const next = new Float32Array(prev);
        const startIdx = Math.min(p1.idx, p2.idx);
        const endIdx = Math.max(p1.idx, p2.idx);
        const steps = Math.max(1, endIdx - startIdx);
        for (let i = startIdx; i <= endIdx && i <= TABLE_SIZE; i++) {
          const t = steps > 0 ? (i - startIdx) / steps : 0;
          const val = p1.idx <= p2.idx ? p1.val + (p2.val - p1.val) * t : p2.val + (p1.val - p2.val) * (1 - t);
          next[i] = val;
        }
        // Wrap endpoint
        next[TABLE_SIZE] = next[0];
        return next;
      });
    },
    [posToWaveform],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      drawingRef.current = true;
      lastPosRef.current = { x: e.clientX, y: e.clientY };

      const pos = posToWaveform(e.clientX, e.clientY);
      if (pos) {
        setWaveform((prev) => {
          const next = new Float32Array(prev);
          next[pos.idx] = pos.val;
          next[TABLE_SIZE] = next[0];
          return next;
        });
      }
    },
    [posToWaveform],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!drawingRef.current) return;
      const cur = { x: e.clientX, y: e.clientY };
      if (lastPosRef.current) {
        interpolateDraw(lastPosRef.current, cur);
      }
      lastPosRef.current = cur;
    },
    [interpolateDraw],
  );

  const handlePointerUp = useCallback(() => {
    drawingRef.current = false;
    lastPosRef.current = null;
  }, []);

  const handleApply = useCallback(() => {
    const table = new Float32Array(waveform);
    const wt: Wavetable = { frames: [table], tableSize: TABLE_SIZE, numFrames: 1 };
    onApply(wt);
    onClose();
  }, [waveform, onApply, onClose]);

  const handlePreset = useCallback((type: "sine" | "saw" | "square" | "triangle") => {
    const data = new Float32Array(TABLE_SIZE + 1);
    for (let i = 0; i <= TABLE_SIZE; i++) {
      const phase = i / TABLE_SIZE;
      switch (type) {
        case "sine":
          data[i] = Math.sin(2 * Math.PI * phase);
          break;
        case "saw":
          data[i] = 2 * phase - 1;
          break;
        case "square":
          data[i] = phase < 0.5 ? 1 : -1;
          break;
        case "triangle":
          if (phase < 0.25) data[i] = phase * 4;
          else if (phase < 0.75) data[i] = 2 - phase * 4;
          else data[i] = phase * 4 - 4;
          break;
      }
    }
    data[TABLE_SIZE] = data[0];
    setWaveform(data);
  }, []);

  const handleClear = useCallback(() => {
    setWaveform(new Float32Array(TABLE_SIZE + 1));
  }, []);

  const handleSmooth = useCallback(() => {
    setWaveform((prev) => {
      const next = new Float32Array(TABLE_SIZE + 1);
      for (let i = 0; i < TABLE_SIZE; i++) {
        const p = (i - 1 + TABLE_SIZE) % TABLE_SIZE;
        const n = (i + 1) % TABLE_SIZE;
        next[i] = prev[p] * 0.25 + prev[i] * 0.5 + prev[n] * 0.25;
      }
      next[TABLE_SIZE] = next[0];
      return next;
    });
  }, []);

  const handleNormalize = useCallback(() => {
    setWaveform((prev) => {
      let max = 0;
      for (let i = 0; i < TABLE_SIZE; i++) {
        max = Math.max(max, Math.abs(prev[i]));
      }
      if (max === 0) return prev;
      const next = new Float32Array(TABLE_SIZE + 1);
      for (let i = 0; i <= TABLE_SIZE; i++) {
        next[i] = prev[i] / max;
      }
      return next;
    });
  }, []);

  const handleHarmonics = useCallback((harmonicCount: number) => {
    const data = new Float32Array(TABLE_SIZE + 1);
    for (let h = 1; h <= harmonicCount; h++) {
      const amp = 1 / h;
      for (let i = 0; i <= TABLE_SIZE; i++) {
        data[i] += amp * Math.sin(2 * Math.PI * h * (i / TABLE_SIZE));
      }
    }
    // Normalize
    let max = 0;
    for (let i = 0; i < TABLE_SIZE; i++) max = Math.max(max, Math.abs(data[i]));
    if (max > 0) for (let i = 0; i <= TABLE_SIZE; i++) data[i] /= max;
    data[TABLE_SIZE] = data[0];
    setWaveform(data);
  }, []);

  if (!open) return null;

  const color = osc === "a" ? "var(--osc-a)" : "var(--osc-b)";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-[660px] bg-bg-panel border border-border-default rounded-lg flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border-default">
          <span className="text-sm font-medium tracking-wider" style={{ color }}>
            WAVEFORM EDITOR — OSC {osc.toUpperCase()}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleApply}
              className="px-3 py-1 text-[11px] text-bg-darkest bg-accent-blue rounded cursor-pointer hover:brightness-110 transition-all"
            >
              Apply
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-2 py-1 text-[11px] text-text-muted hover:text-text-primary cursor-pointer"
            >
              X
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div className="p-3">
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            className="w-full rounded border border-border-default cursor-crosshair"
            style={{ touchAction: "none" }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          />
        </div>

        {/* Tools */}
        <div className="px-4 pb-3 flex flex-wrap items-center gap-1.5">
          <span className="text-[9px] text-text-muted uppercase mr-1">Preset:</span>
          {(["sine", "saw", "square", "triangle"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => handlePreset(t)}
              className="px-2 py-0.5 text-[10px] text-text-muted hover:text-text-primary bg-bg-surface border border-border-default rounded cursor-pointer transition-colors"
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}

          <span className="text-[9px] text-text-muted uppercase ml-2 mr-1">Harmonics:</span>
          {[4, 8, 16, 32].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => handleHarmonics(n)}
              className="px-2 py-0.5 text-[10px] text-text-muted hover:text-text-primary bg-bg-surface border border-border-default rounded cursor-pointer transition-colors"
            >
              {n}
            </button>
          ))}

          <span className="text-[9px] text-text-muted uppercase ml-2 mr-1">Edit:</span>
          <button
            type="button"
            onClick={handleSmooth}
            className="px-2 py-0.5 text-[10px] text-text-muted hover:text-text-primary bg-bg-surface border border-border-default rounded cursor-pointer transition-colors"
          >
            Smooth
          </button>
          <button
            type="button"
            onClick={handleNormalize}
            className="px-2 py-0.5 text-[10px] text-text-muted hover:text-text-primary bg-bg-surface border border-border-default rounded cursor-pointer transition-colors"
          >
            Normalize
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="px-2 py-0.5 text-[10px] text-text-muted hover:text-accent-red bg-bg-surface border border-border-default rounded cursor-pointer transition-colors"
          >
            Clear
          </button>
        </div>

        {/* Footer hint */}
        <div className="px-4 py-1.5 text-[10px] text-text-muted border-t border-border-default">
          Draw on the canvas to shape the waveform. Click Apply to load into the oscillator.
        </div>
      </div>
    </div>
  );
}
