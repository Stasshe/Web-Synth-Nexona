"use client";

import { synthState } from "@/state/synthState";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  type ControlPoint,
  CurveType,
  type WaveformModel,
  makePointId,
  presetModel,
  sineModel,
} from "../WaveformEditor/curveTypes";
import { generateWaveformFromPoints } from "../WaveformEditor/generateFromPoints";

const TABLE_SIZE = 256;
const CANVAS_W = 600;
const CANVAS_H = 200;
const POINT_RADIUS = 6;
const HIT_RADIUS = 12;
const GRID_X = 16;
const GRID_Y = 8;
const MIN_GAP = 1 / GRID_X;
const DRAG_THRESHOLD = 4;

const PRESET_NAMES = ["Sine", "Saw", "Square", "Triangle"] as const;

const CURVE_LABELS: { type: CurveType; label: string }[] = [
  { type: CurveType.LINEAR, label: "Lin" },
  { type: CurveType.SMOOTH, label: "Smooth" },
  { type: CurveType.STEP, label: "Step" },
  { type: CurveType.SINE, label: "Sine" },
];

interface LfoShapeEditorProps {
  open: boolean;
  onClose: () => void;
  onApply: (table: Float32Array) => void;
  lfo: "lfo1" | "lfo2";
}

function loadModel(lfo: "lfo1" | "lfo2"): WaveformModel {
  const pts = synthState.lfos[lfo].controlPoints as ControlPoint[] | null;
  if (pts && pts.length >= 2) return { points: pts.map((p) => ({ ...p })) };
  return sineModel();
}

function modelToCanvas(x: number, y: number) {
  return { cx: x * CANVAS_W, cy: CANVAS_H / 2 - y * (CANVAS_H / 2 - 4) };
}

function snapToGrid(x: number, y: number) {
  return { x: Math.round(x * GRID_X) / GRID_X, y: Math.round(y * GRID_Y) / GRID_Y };
}

function canvasToModel(clientX: number, clientY: number, canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect();
  const px = (clientX - rect.left) * (CANVAS_W / rect.width);
  const py = (clientY - rect.top) * (CANVAS_H / rect.height);
  const rawX = Math.max(0, Math.min(1, px / CANVAS_W));
  const rawY = Math.max(-1, Math.min(1, -((py - CANVAS_H / 2) / (CANVAS_H / 2 - 4))));
  return snapToGrid(rawX, rawY);
}

function findHitPoint(mx: number, my: number, canvas: HTMLCanvasElement, model: WaveformModel) {
  const rect = canvas.getBoundingClientRect();
  const px = (mx - rect.left) * (CANVAS_W / rect.width);
  const py = (my - rect.top) * (CANVAS_H / rect.height);
  let best: string | null = null;
  let bestDist = HIT_RADIUS * HIT_RADIUS;
  for (const pt of model.points) {
    const { cx, cy } = modelToCanvas(pt.x, pt.y);
    const d = (px - cx) ** 2 + (py - cy) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = pt.id;
    }
  }
  return best;
}

function drawEditor(canvas: HTMLCanvasElement, model: WaveformModel, selectedId: string | null) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.fillStyle = "#0d0d14";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Grid
  ctx.strokeStyle = "#1a1a2e";
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= GRID_X; i++) {
    const x = (i / GRID_X) * CANVAS_W;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, CANVAS_H);
    ctx.stroke();
  }
  for (let j = 0; j <= GRID_Y; j++) {
    const y = (j / GRID_Y) * CANVAS_H;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(CANVAS_W, y);
    ctx.stroke();
  }

  // Center line
  ctx.strokeStyle = "#2a2a45";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, CANVAS_H / 2);
  ctx.lineTo(CANVAS_W, CANVAS_H / 2);
  ctx.stroke();

  // Waveform preview
  const wave = generateWaveformFromPoints(model, TABLE_SIZE);
  ctx.strokeStyle = "#8844ff";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 0; i <= TABLE_SIZE; i++) {
    const x = (i / TABLE_SIZE) * CANVAS_W;
    const y = CANVAS_H / 2 - wave[i] * (CANVAS_H / 2 - 4);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // Control point dots
  for (const pt of model.points) {
    const { cx, cy } = modelToCanvas(pt.x, pt.y);
    const isSelected = pt.id === selectedId;
    const isEndpoint = pt.x === 0 || pt.x === 1;
    ctx.beginPath();
    ctx.arc(cx, cy, POINT_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = isSelected ? "#ff8844" : isEndpoint ? "#6633cc" : "#aa55ff";
    ctx.fill();
    ctx.strokeStyle = "#ffffff44";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

export function LfoShapeEditor({ open, onClose, onApply, lfo }: LfoShapeEditorProps) {
  const [model, setModel] = useState<WaveformModel>(() => loadModel(lfo));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragStateRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);

  // Reload model when editor opens
  useEffect(() => {
    if (open) setModel(loadModel(lfo));
  }, [open, lfo]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !open) return;
    drawEditor(canvas, model, selectedId);
  }, [model, selectedId, open]);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const hit = findHitPoint(e.clientX, e.clientY, canvas, model);
    if (hit) {
      setSelectedId(hit);
      dragStateRef.current = { id: hit, startX: e.clientX, startY: e.clientY, moved: false };
    } else {
      // Add a new point
      const { x, y } = canvasToModel(e.clientX, e.clientY, canvas);
      const isEndpoint = model.points.some((p) => p.x === 0 || p.x === 1);
      const tooClose = model.points.some((p) => Math.abs(p.x - x) < MIN_GAP && !isEndpoint);
      if (!tooClose && x > 0 && x < 1) {
        const newPt: ControlPoint = { id: makePointId(), x, y, curveType: CurveType.SMOOTH };
        const newPoints = [...model.points, newPt].sort((a, b) => a.x - b.x);
        setModel({ points: newPoints });
        setSelectedId(newPt.id);
        dragStateRef.current = { id: newPt.id, startX: e.clientX, startY: e.clientY, moved: false };
      } else {
        setSelectedId(null);
        dragStateRef.current = null;
      }
    }
  }, [model]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const ds = dragStateRef.current;
    if (!ds) return;
    const dx = Math.abs(e.clientX - ds.startX);
    const dy = Math.abs(e.clientY - ds.startY);
    if (!ds.moved && dx < DRAG_THRESHOLD && dy < DRAG_THRESHOLD) return;
    ds.moved = true;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const { x: nx, y: ny } = canvasToModel(e.clientX, e.clientY, canvas);
    setModel((prev) => {
      const pt = prev.points.find((p) => p.id === ds.id);
      if (!pt) return prev;
      const isEndpoint = pt.x === 0 || pt.x === 1;
      const newX = isEndpoint ? pt.x : nx;
      const conflicts = prev.points.some(
        (p) => p.id !== ds.id && Math.abs(p.x - newX) < MIN_GAP,
      );
      if (conflicts && !isEndpoint) return prev;
      const updated = prev.points
        .map((p) => (p.id === ds.id ? { ...p, x: newX, y: ny } : p))
        .sort((a, b) => a.x - b.x);
      return { points: updated };
    });
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const ds = dragStateRef.current;
    dragStateRef.current = null;
    if (!ds) return;
    if (!ds.moved) {
      // Tap on existing point → delete (not endpoints)
      const canvas = canvasRef.current;
      if (!canvas) return;
      const hit = findHitPoint(e.clientX, e.clientY, canvas, model);
      if (hit) {
        const pt = model.points.find((p) => p.id === hit);
        if (pt && pt.x !== 0 && pt.x !== 1) {
          setModel((prev) => ({ points: prev.points.filter((p) => p.id !== hit) }));
          setSelectedId(null);
        }
      }
    }
  }, [model]);

  const setCurveType = useCallback((type: CurveType) => {
    if (!selectedId) return;
    setModel((prev) => ({
      points: prev.points.map((p) => (p.id === selectedId ? { ...p, curveType: type } : p)),
    }));
  }, [selectedId]);

  const handlePreset = useCallback((name: (typeof PRESET_NAMES)[number]) => {
    setModel(presetModel(name));
    setSelectedId(null);
  }, []);

  const handleApply = useCallback(() => {
    const table = generateWaveformFromPoints(model, TABLE_SIZE);
    // Save control points to state for persistence
    synthState.lfos[lfo].controlPoints = model.points.map((p) => ({ ...p })) as unknown[];
    synthState.lfos[lfo].customShape = Array.from(table);
    synthState.lfos[lfo].shape = 4; // LfoShape.CUSTOM
    onApply(table);
    onClose();
  }, [model, lfo, onApply, onClose]);

  if (!open) return null;

  const selectedPt = model.points.find((p) => p.id === selectedId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#12121e] border border-[#2a2a45] rounded-xl shadow-2xl p-4 flex flex-col gap-3"
        style={{ width: 640 }}>

        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-text-primary uppercase tracking-wider">
            {lfo === "lfo1" ? "LFO 1" : "LFO 2"} — Custom Shape
          </span>
          <div className="flex gap-1">
            {PRESET_NAMES.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => handlePreset(name)}
                className="px-2 py-0.5 text-[10px] rounded border border-border-default text-text-muted hover:border-lfo hover:text-lfo transition-colors"
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        {/* Canvas */}
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="rounded border border-[#2a2a45] cursor-crosshair"
          style={{ width: "100%", height: "auto" }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        />

        {/* Help text */}
        <p className="text-[10px] text-text-muted">
          Click empty space to add a point · Click an existing point to select · Drag to move · Tap a selected inner point to delete
        </p>

        {/* Curve type for selected point */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-text-muted uppercase tracking-wider w-20">Curve type</span>
          <div className="flex gap-1">
            {CURVE_LABELS.map(({ type, label }) => (
              <button
                key={type}
                type="button"
                disabled={!selectedPt}
                onClick={() => setCurveType(type)}
                className={`px-2 py-0.5 text-[10px] rounded border transition-colors ${
                  selectedPt?.curveType === type
                    ? "border-lfo text-lfo"
                    : "border-border-default text-text-muted hover:border-lfo/50"
                } disabled:opacity-30 disabled:cursor-not-allowed`}
                style={selectedPt?.curveType === type ? { backgroundColor: "rgba(136,68,255,0.15)" } : undefined}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs rounded border border-border-default text-text-muted hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="px-4 py-1.5 text-xs rounded border border-lfo text-lfo hover:bg-lfo/10 transition-colors"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
