"use client";

import { WavetableType, generateTable } from "@/audio/dsp/wavetable/wavetableEngine";
import type { Wavetable } from "@/audio/dsp/wavetable/wavetableEngine";
import { synthState } from "@/state/synthState";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type ControlPoint,
  CurveType,
  type PresetName,
  type WaveformModel,
  defaultModel,
  makePointId,
  presetModel,
  sineModel,
} from "./curveTypes";
import { generateWaveformFromPoints } from "./generateFromPoints";

const TABLE_SIZE = 2048;
const CANVAS_W = 600;
const CANVAS_H = 240;
const POINT_RADIUS = 6;
const HIT_RADIUS = 12;
const MIN_GAP = 0.005;

const PRESET_NAMES = ["Sine", "Saw", "Square", "Triangle"] as const;

const PRESET_WAVEFORM_TYPE: Record<string, WavetableType> = {
  Sine: WavetableType.SINE,
  Saw: WavetableType.SAW,
  Square: WavetableType.SQUARE,
  Triangle: WavetableType.TRIANGLE,
};

const CURVE_LABELS: { type: CurveType; label: string }[] = [
  { type: CurveType.LINEAR, label: "Linear" },
  { type: CurveType.SMOOTH, label: "Smooth" },
  { type: CurveType.STEP, label: "Step" },
  { type: CurveType.SINE, label: "Sine" },
];

interface WaveformEditorProps {
  open: boolean;
  onClose: () => void;
  onApply: (wt: Wavetable) => void;
  onResetPreset?: () => void;
  osc: "a" | "b" | "sub";
}

function loadExistingModel(osc: "a" | "b" | "sub"): WaveformModel {
  const oscState = synthState.oscillators[osc];
  const controlPoints = (oscState as Record<string, unknown>).controlPoints as
    | ControlPoint[]
    | null
    | undefined;
  if (controlPoints && controlPoints.length >= 2) {
    return { points: controlPoints.map((p) => ({ ...p })) };
  }
  // If it's a built-in preset, generate matching control points
  const name = ((oscState as Record<string, unknown>).waveformName as string) ?? "Sine";
  if (name in PRESET_WAVEFORM_TYPE) {
    return presetModel(name as PresetName);
  }
  return sineModel();
}

function loadExistingName(osc: "a" | "b" | "sub"): string {
  const oscState = synthState.oscillators[osc];
  return ((oscState as Record<string, unknown>).waveformName as string) ?? "Sine";
}

function isPresetName(name: string): name is PresetName {
  return name in PRESET_WAVEFORM_TYPE;
}

function modelToCanvas(x: number, y: number): { cx: number; cy: number } {
  return {
    cx: x * CANVAS_W,
    cy: CANVAS_H / 2 - y * (CANVAS_H / 2 - 4),
  };
}

function canvasToModel(
  clientX: number,
  clientY: number,
  canvas: HTMLCanvasElement,
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  const px = (clientX - rect.left) * (CANVAS_W / rect.width);
  const py = (clientY - rect.top) * (CANVAS_H / rect.height);
  const x = Math.max(0, Math.min(1, px / CANVAS_W));
  const y = Math.max(-1, Math.min(1, -((py - CANVAS_H / 2) / (CANVAS_H / 2 - 4))));
  return { x, y };
}

function findHitPoint(
  mx: number,
  my: number,
  canvas: HTMLCanvasElement,
  model: WaveformModel,
): string | null {
  const rect = canvas.getBoundingClientRect();
  const px = (mx - rect.left) * (CANVAS_W / rect.width);
  const py = (my - rect.top) * (CANVAS_H / rect.height);

  let best: string | null = null;
  let bestDist = HIT_RADIUS * HIT_RADIUS;

  for (const pt of model.points) {
    const { cx, cy } = modelToCanvas(pt.x, pt.y);
    const dx = px - cx;
    const dy = py - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 < bestDist) {
      bestDist = d2;
      best = pt.id;
    }
  }
  return best;
}

export function WaveformEditor({ open, onClose, onApply, onResetPreset, osc }: WaveformEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [model, setModel] = useState<WaveformModel>(() => loadExistingModel(osc));
  const [currentName, setCurrentName] = useState<string>(() => loadExistingName(osc));
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [draggingPointId, setDraggingPointId] = useState<string | null>(null);

  // Always derive display waveform from the model — single source of truth
  const displayWaveform = useMemo(
    () => generateWaveformFromPoints(model, TABLE_SIZE),
    [model],
  );

  // Reload when opening for a different osc
  useEffect(() => {
    if (open) {
      setModel(loadExistingModel(osc));
      setCurrentName(loadExistingName(osc));
      setSelectedPointId(null);
      setDraggingPointId(null);
    }
  }, [open, osc]);

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
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, h / 4);
    ctx.lineTo(w, h / 4);
    ctx.moveTo(0, (3 * h) / 4);
    ctx.lineTo(w, (3 * h) / 4);
    ctx.stroke();
    for (let i = 1; i < 8; i++) {
      ctx.beginPath();
      ctx.moveTo((w * i) / 8, 0);
      ctx.lineTo((w * i) / 8, h);
      ctx.stroke();
    }

    // Waveform line
    const color = osc === "a" ? "#4488ff" : osc === "b" ? "#ff8844" : "#44ddcc";
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.shadowColor = color;
    ctx.shadowBlur = 4;
    ctx.beginPath();

    for (let x = 0; x < w; x++) {
      const idx = Math.floor((x / w) * TABLE_SIZE);
      const val = displayWaveform[idx] ?? 0;
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

    // Control points
    // Vertical guide lines at each point
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    for (const pt of model.points) {
      const { cx } = modelToCanvas(pt.x, pt.y);
      ctx.beginPath();
      ctx.moveTo(cx, 0);
      ctx.lineTo(cx, h);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Draw points
    for (const pt of model.points) {
      const { cx, cy } = modelToCanvas(pt.x, pt.y);
      const isSelected = pt.id === selectedPointId;

      // Outer ring
      ctx.beginPath();
      ctx.arc(cx, cy, POINT_RADIUS + (isSelected ? 2 : 0), 0, Math.PI * 2);
      ctx.fillStyle = isSelected ? color : "rgba(255,255,255,0.15)";
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.stroke();

      // Inner dot
      ctx.beginPath();
      ctx.arc(cx, cy, 2, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.fill();
    }
  }, [displayWaveform, osc, model, selectedPointId]);

  useEffect(() => {
    if (open) draw();
  }, [open, draw]);

  // --- Pointer handlers for point manipulation ---

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);

      const hitId = findHitPoint(e.clientX, e.clientY, canvas, model);

      if (hitId) {
        setSelectedPointId(hitId);
        setDraggingPointId(hitId);
      } else {
        // Add new point — always becomes custom
        const { x, y } = canvasToModel(e.clientX, e.clientY, canvas);
        const newPt: ControlPoint = {
          id: makePointId(),
          x,
          y,
          curveType: CurveType.SMOOTH,
        };
        setModel((prev) => {
          const pts = [...prev.points, newPt].sort((a, b) => a.x - b.x);
          return { points: pts };
        });
        setSelectedPointId(newPt.id);
        setDraggingPointId(newPt.id);
        setCurrentName("Custom");
      }
    },
    [model],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!draggingPointId) return;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const { x, y } = canvasToModel(e.clientX, e.clientY, canvas);

      setModel((prev) => {
        const idx = prev.points.findIndex((p) => p.id === draggingPointId);
        if (idx < 0) return prev;

        const pts = prev.points.map((p) => ({ ...p }));
        const isFirst = idx === 0;
        const isLast = idx === pts.length - 1;

        if (isFirst) {
          pts[0].y = y;
          pts[pts.length - 1].y = y;
        } else if (isLast) {
          pts[pts.length - 1].y = y;
          pts[0].y = y;
        } else {
          const minX = pts[idx - 1].x + MIN_GAP;
          const maxX = pts[idx + 1].x - MIN_GAP;
          pts[idx].x = Math.max(minX, Math.min(maxX, x));
          pts[idx].y = y;
        }

        return { points: pts };
      });
      // Dragging a point means it's now custom
      setCurrentName("Custom");
    },
    [draggingPointId],
  );

  const handlePointerUp = useCallback(() => {
    setDraggingPointId(null);
  }, []);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;

      const hitId = findHitPoint(e.clientX, e.clientY, canvas, model);
      if (!hitId) return;

      // Can't delete endpoints
      const idx = model.points.findIndex((p) => p.id === hitId);
      if (idx === 0 || idx === model.points.length - 1) return;

      setModel((prev) => ({
        points: prev.points.filter((p) => p.id !== hitId),
      }));
      if (selectedPointId === hitId) setSelectedPointId(null);
      setCurrentName("Custom");
    },
    [model, selectedPointId],
  );

  // --- Actions ---

  const handleApply = useCallback(() => {
    const oscState = synthState.oscillators[osc] as Record<string, unknown>;
    oscState.waveformName = currentName;
    oscState.controlPoints = model.points.map((p) => ({ ...p }));

    if (isPresetName(currentName)) {
      // Preset: just set the waveform type on state — the SAB/worklet will handle
      // regeneration automatically. Clear custom flag via reset message.
      oscState.customWaveform = null;
      if (osc !== "sub") {
        (oscState as Record<string, unknown>).waveformType = PRESET_WAVEFORM_TYPE[currentName];
        onResetPreset?.();
      } else {
        // Sub osc doesn't use SAB wavetable index, so send directly
        const wt = generateTable(PRESET_WAVEFORM_TYPE[currentName], TABLE_SIZE);
        onApply(wt);
      }
    } else {
      // Custom: multi-frame wavetable via spectral morph.
      // Frame 0 = fundamental only, frame 63 = full waveform.
      const waveform = generateWaveformFromPoints(model, TABLE_SIZE);
      const NUM_FRAMES = 64;
      const MAX_HARMONICS = 128;

      // Compute harmonic magnitudes + phases via DFT of the base waveform
      const mags = new Float64Array(MAX_HARMONICS + 1);
      const phases = new Float64Array(MAX_HARMONICS + 1);
      for (let h = 1; h <= MAX_HARMONICS; h++) {
        let re = 0;
        let im = 0;
        for (let i = 0; i < TABLE_SIZE; i++) {
          const angle = (2 * Math.PI * h * i) / TABLE_SIZE;
          re += waveform[i] * Math.cos(angle);
          im -= waveform[i] * Math.sin(angle);
        }
        re /= TABLE_SIZE / 2;
        im /= TABLE_SIZE / 2;
        mags[h] = Math.sqrt(re * re + im * im);
        phases[h] = Math.atan2(im, re);
      }

      const frames: Float32Array[] = [];
      for (let f = 0; f < NUM_FRAMES; f++) {
        const table = new Float32Array(TABLE_SIZE + 1);
        const numH = 1 + Math.floor((f / (NUM_FRAMES - 1)) * (MAX_HARMONICS - 1));
        for (let h = 1; h <= numH; h++) {
          if (mags[h] < 1e-6) continue;
          for (let i = 0; i <= TABLE_SIZE; i++) {
            table[i] += mags[h] * Math.cos((2 * Math.PI * h * i) / TABLE_SIZE + phases[h]);
          }
        }
        // Normalize
        let max = 0;
        for (let i = 0; i < TABLE_SIZE; i++) {
          const a = Math.abs(table[i]);
          if (a > max) max = a;
        }
        if (max > 0) {
          for (let i = 0; i <= TABLE_SIZE; i++) table[i] /= max;
        }
        table[TABLE_SIZE] = table[0];
        frames.push(table);
      }

      const wt: Wavetable = { frames, tableSize: TABLE_SIZE, numFrames: NUM_FRAMES };
      oscState.customWaveform = Array.from(waveform);
      onApply(wt);
    }
    onClose();
  }, [model, currentName, osc, onApply, onResetPreset, onClose]);

  const handlePreset = useCallback((name: PresetName) => {
    setModel(presetModel(name));
    setCurrentName(name);
    setSelectedPointId(null);
  }, []);

  const handleClear = useCallback(() => {
    setModel(defaultModel());
    setCurrentName("Custom");
    setSelectedPointId(null);
  }, []);

  const handleCurveType = useCallback(
    (ct: CurveType) => {
      if (!selectedPointId) return;
      setModel((prev) => ({
        points: prev.points.map((p) => (p.id === selectedPointId ? { ...p, curveType: ct } : p)),
      }));
      setCurrentName("Custom");
    },
    [selectedPointId],
  );

  if (!open) return null;

  const color = osc === "a" ? "var(--osc-a)" : osc === "b" ? "var(--osc-b)" : "var(--accent-cyan)";
  const oscLabel = osc === "sub" ? "SUB" : `OSC ${osc.toUpperCase()}`;
  const selectedPoint = model.points.find((p) => p.id === selectedPointId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-[660px] bg-bg-panel border border-border-default rounded-lg flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border-default">
          <span className="text-sm font-medium tracking-wider" style={{ color }}>
            WAVEFORM EDITOR — {oscLabel}
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
            onContextMenu={handleContextMenu}
          />
        </div>

        {/* Curve type toolbar */}
        <div className="px-4 pb-2 flex flex-wrap items-center gap-1.5">
          <span className="text-[9px] text-text-muted uppercase mr-1">Curve:</span>
          {CURVE_LABELS.map(({ type, label }) => (
            <button
              key={type}
              type="button"
              disabled={!selectedPoint}
              onClick={() => handleCurveType(type)}
              className={`px-2 py-0.5 text-[10px] border rounded cursor-pointer transition-colors ${
                selectedPoint?.curveType === type
                  ? "text-text-primary bg-bg-darkest border-accent-blue"
                  : "text-text-muted hover:text-text-primary bg-bg-surface border-border-default"
              } disabled:opacity-30 disabled:cursor-default`}
            >
              {label}
            </button>
          ))}
          {selectedPoint && (
            <span className="text-[9px] text-text-muted ml-2">
              ({selectedPoint.x.toFixed(2)}, {selectedPoint.y.toFixed(2)})
            </span>
          )}
        </div>

        {/* Tools */}
        <div className="px-4 pb-3 flex flex-wrap items-center gap-1.5">
          <span className="text-[9px] text-text-muted uppercase mr-1">Preset:</span>
          {PRESET_NAMES.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => handlePreset(name)}
              className={`px-2 py-0.5 text-[10px] border rounded cursor-pointer transition-colors ${
                currentName === name
                  ? "text-text-primary bg-bg-darkest border-accent-blue"
                  : "text-text-muted hover:text-text-primary bg-bg-surface border-border-default"
              }`}
            >
              {name}
            </button>
          ))}

          <span className="text-[9px] text-text-muted uppercase ml-2 mr-1">Edit:</span>
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
          Click to add points. Drag to move. Right-click to delete. Select a point to change its
          curve type.
        </div>
      </div>
    </div>
  );
}
