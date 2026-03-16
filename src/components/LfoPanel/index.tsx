"use client";
import { ModSource } from "@/audio/dsp/modulation/modMatrix";
import { Knob } from "@/components/ui/Knob";
import { Panel } from "@/components/ui/Panel";
import { SelectWithArrows } from "@/components/ui/SelectWithArrows";
import {
  type ControlPoint,
  CurveType,
  type WaveformModel,
  makePointId,
  sineModel,
  triangleModel,
  sawModel,
  squareModel,
} from "@/components/WaveformEditor/curveTypes";
import { generateWaveformFromPoints } from "@/components/WaveformEditor/generateFromPoints";
import { DND_TYPES, type ModSourceDragItem } from "@/dnd/types";
import { modFeedbackState } from "@/state/modFeedback";
import { synthState } from "@/state/synthState";
import { GripHorizontal } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDrag } from "react-dnd";
import { useSnapshot } from "valtio";

const CANVAS_W = 200;
const CANVAS_H = 80;
const TABLE_SIZE = 256;
const POINT_RADIUS = 4;
const HIT_RADIUS = 10;
const GRID_X = 8;
const GRID_Y = 4;
const MIN_GAP = 1 / GRID_X;
const DRAG_THRESHOLD = 3;

const LFO_PRESETS = [
  { value: "Sine", label: "Sine" },
  { value: "Triangle", label: "Tri" },
  { value: "Saw", label: "Saw" },
  { value: "Square", label: "Sqr" },
  { value: "S&H", label: "S&H" },
] as const;

type PresetKey = (typeof LFO_PRESETS)[number]["value"];

const PRESET_MODEL: Partial<Record<PresetKey, () => WaveformModel>> = {
  Sine: sineModel,
  Triangle: triangleModel,
  Saw: sawModel,
  Square: squareModel,
};

const CURVE_LABELS: { type: CurveType; label: string }[] = [
  { type: CurveType.LINEAR, label: "Lin" },
  { type: CurveType.SMOOTH, label: "Cur" },
  { type: CurveType.STEP, label: "Stp" },
  { type: CurveType.SINE, label: "Sin" },
];

function snapToGrid(x: number, y: number) {
  return { x: Math.round(x * GRID_X) / GRID_X, y: Math.round(y * GRID_Y) / GRID_Y };
}

function modelToCanvas(x: number, y: number) {
  return { cx: x * CANVAS_W, cy: CANVAS_H / 2 - y * (CANVAS_H / 2 - 4) };
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

function drawCanvas(
  canvas: HTMLCanvasElement,
  model: WaveformModel,
  selectedId: string | null,
  phase: number,
  isSandH: boolean,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.fillStyle = "#0d0d14";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Subtle grid
  ctx.strokeStyle = "#181828";
  ctx.lineWidth = 0.5;
  for (let i = 1; i < GRID_X; i++) {
    const x = (i / GRID_X) * CANVAS_W;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, CANVAS_H);
    ctx.stroke();
  }

  // Center line
  ctx.strokeStyle = "#2a2a45";
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(0, CANVAS_H / 2);
  ctx.lineTo(CANVAS_W, CANVAS_H / 2);
  ctx.stroke();

  // Waveform
  if (isSandH) {
    // Stylized S&H preview
    ctx.strokeStyle = "#8844ff";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    const steps = 8;
    for (let i = 0; i <= steps; i++) {
      const p = i / steps;
      const y = Math.sin(p * 17.3 + 1.2) * 0.7;
      const x0 = p * CANVAS_W;
      const x1 = Math.min(((i + 1) / steps) * CANVAS_W, CANVAS_W);
      const cy = CANVAS_H / 2 - y * (CANVAS_H / 2 - 4);
      if (i === 0) ctx.moveTo(x0, cy);
      else ctx.lineTo(x0, cy);
      ctx.lineTo(x1, cy);
    }
    ctx.stroke();
  } else {
    // Waveform from control points
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
      ctx.fillStyle = isSelected ? "#ff8844" : isEndpoint ? "#5522aa" : "#9955ff";
      ctx.fill();
    }
  }

  // Phase indicator
  if (phase > 0) {
    const px = phase * CANVAS_W;
    ctx.strokeStyle = "rgba(136,68,255,0.45)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px, 0);
    ctx.lineTo(px, CANVAS_H);
    ctx.stroke();
  }
}

function loadModel(lfo: (typeof synthState.lfos)[keyof typeof synthState.lfos]): WaveformModel {
  const pts = lfo.controlPoints as ControlPoint[] | null;
  if (pts && pts.length >= 2) return { points: pts.map((p) => ({ ...p })) };
  return sineModel();
}

interface LfoPanelProps {
  index: "lfo1" | "lfo2";
  onApplyShape?: (table: Float32Array) => void;
}

export function LfoPanel({ index, onApplyShape }: LfoPanelProps) {
  const snap = useSnapshot(synthState);
  const fb = useSnapshot(modFeedbackState);
  const lfo = snap.lfos[index];
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const label = index === "lfo1" ? "LFO 1" : "LFO 2";
  const modSource = index === "lfo1" ? ModSource.LFO1 : ModSource.LFO2;
  const phase = index === "lfo1" ? fb.lfo1Phase : fb.lfo2Phase;

  // Local model for smooth drag without Valtio overhead on every move
  const [model, setModel] = useState<WaveformModel>(() => loadModel(synthState.lfos[index]));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const dragStateRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    moved: boolean;
    isNew: boolean;
  } | null>(null);

  const isSandH = lfo.presetName === "S&H";

  // Sync model when controlPoints change externally (preset load etc.)
  const controlPointsKey = JSON.stringify(lfo.controlPoints);
  useEffect(() => {
    setModel(loadModel(synthState.lfos[index]));
  }, [index, controlPointsKey]);

  // Populate customShape on first mount if missing (needed before engine start)
  useEffect(() => {
    if (synthState.lfos[index].customShape !== null) return;
    const lfoState = synthState.lfos[index];
    // Prefer saved controlPoints (restores custom-drawn shapes from patch)
    const savedPts = lfoState.controlPoints as ControlPoint[] | null;
    let m: WaveformModel;
    if (savedPts && savedPts.length >= 2) {
      m = { points: savedPts.map((p) => ({ ...p })) };
    } else {
      const preset = lfoState.presetName ?? "Sine";
      m = (PRESET_MODEL[preset as PresetKey] ?? sineModel)();
    }
    const table = generateWaveformFromPoints(m, TABLE_SIZE);
    synthState.lfos[index].customShape = Array.from(table);
    synthState.lfos[index].controlPoints = m.points as unknown[];
    setModel(m);
    // onApplyShape NOT called — engine hasn't started yet.
  }, [index]); // eslint-disable-line react-hooks/exhaustive-deps

  const [{ isDragging }, dragRef] = useDrag(
    () => ({
      type: DND_TYPES.MOD_SOURCE,
      item: { source: modSource, label } as ModSourceDragItem,
      collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    }),
    [modSource, label],
  );

  // Flush model to state + worklet
  const commitModel = useCallback(
    (m: WaveformModel, presetName: string) => {
      const table = generateWaveformFromPoints(m, TABLE_SIZE);
      synthState.lfos[index].customShape = Array.from(table);
      synthState.lfos[index].controlPoints = m.points.map((p) => ({ ...p })) as unknown[];
      synthState.lfos[index].presetName = presetName;
      synthState.lfos[index].shape = 4;
      onApplyShape?.(table);
    },
    [index, onApplyShape],
  );

  const setCurveType = useCallback(
    (type: CurveType) => {
      if (!selectedId) return;
      setModel((prev) => {
        const newModel = {
          points: prev.points.map((p) => (p.id === selectedId ? { ...p, curveType: type } : p)),
        };
        commitModel(newModel, "Custom");
        return newModel;
      });
    },
    [selectedId, commitModel],
  );

  // Redraw whenever model/phase changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawCanvas(canvas, model, selectedId, phase, isSandH);
  }, [model, selectedId, phase, isSandH]);

  // Preset selection
  const handlePresetChange = useCallback(
    (val: string) => {
      if (val === "S&H") {
        synthState.lfos[index].presetName = "S&H";
        synthState.lfos[index].shape = 3;
        // Send a S&H indicator — DSP handles it via shape=3
        setSelectedId(null);
        return;
      }
      const modelFn = PRESET_MODEL[val as PresetKey];
      if (!modelFn) return;
      const m = modelFn();
      setModel(m);
      setSelectedId(null);
      commitModel(m, val);
    },
    [index, commitModel],
  );

  // Canvas pointer handlers — only when not S&H
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (isSandH) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      const hit = findHitPoint(e.clientX, e.clientY, canvas, model);
      if (hit) {
        setSelectedId(hit);
        dragStateRef.current = {
          id: hit,
          startX: e.clientX,
          startY: e.clientY,
          moved: false,
          isNew: false,
        };
      } else {
        const { x, y } = canvasToModel(e.clientX, e.clientY, canvas);
        if (x > 0 && x < 1) {
          const conflicts = model.points.some((p) => Math.abs(p.x - x) < MIN_GAP);
          if (!conflicts) {
            const newPt: ControlPoint = { id: makePointId(), x, y, curveType: CurveType.SMOOTH };
            const newPoints = [...model.points, newPt].sort((a, b) => a.x - b.x);
            const newModel = { points: newPoints };
            setModel(newModel);
            setSelectedId(newPt.id);
            dragStateRef.current = {
              id: newPt.id,
              startX: e.clientX,
              startY: e.clientY,
              moved: false,
              isNew: true,
            };
            return;
          }
        }
        setSelectedId(null);
        dragStateRef.current = null;
      }
    },
    [isSandH, model],
  );

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
      if (!isEndpoint && prev.points.some((p) => p.id !== ds.id && Math.abs(p.x - newX) < MIN_GAP))
        return prev;
      return {
        points: prev.points
          .map((p) => (p.id === ds.id ? { ...p, x: newX, y: ny } : p))
          .sort((a, b) => a.x - b.x),
      };
    });
  }, []);

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const ds = dragStateRef.current;
      dragStateRef.current = null;
      if (!ds) return;
      if (!ds.moved) {
        if (ds.isNew) {
          // Point was just added — commit as-is, don't delete it
          commitModel(model, "Custom");
          return;
        }
        // Tap on existing inner point → delete
        const canvas = canvasRef.current;
        if (!canvas) return;
        const hit = findHitPoint(e.clientX, e.clientY, canvas, model);
        if (hit) {
          const pt = model.points.find((p) => p.id === hit);
          if (pt && pt.x !== 0 && pt.x !== 1) {
            const newModel = { points: model.points.filter((p) => p.id !== hit) };
            setModel(newModel);
            setSelectedId(null);
            commitModel(newModel, "Custom");
            return;
          }
        }
      }
      // Commit drag result
      commitModel(model, "Custom");
    },
    [model, commitModel],
  );

  // Derive SelectWithArrows display label
  const displayLabel =
    lfo.presetName === "Custom"
      ? "Custom"
      : (LFO_PRESETS.find((p) => p.value === lfo.presetName)?.label ?? lfo.presetName);

  const selectVal = LFO_PRESETS.find((p) => p.value === lfo.presetName)?.value ?? "Sine";

  return (
    <Panel title={label} color="var(--lfo)">
      {/* Preset selector */}
      <SelectWithArrows
        value={selectVal}
        options={LFO_PRESETS as unknown as { value: string; label: string }[]}
        onChange={handlePresetChange}
        displayLabel={lfo.presetName === "Custom" ? "Custom" : undefined}
        accentColor="var(--lfo)"
        className="mb-1"
      />

      {/* Inline editable canvas */}
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        className={`w-full h-[80px] rounded bg-bg-dark mb-1 ${isSandH ? "cursor-default" : "cursor-crosshair"}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        title={isSandH ? "S&H — not editable" : "Click to add · Drag to move · Tap point to delete"}
      />

      {/* Curve type selector — shown when a point is selected */}
      {!isSandH && (
        <div className="flex gap-1 mb-1">
          {CURVE_LABELS.map(({ type, label: curveLabel }) => {
            const selPt = model.points.find((p) => p.id === selectedId);
            const active = selPt?.curveType === type;
            return (
              <button
                key={type}
                type="button"
                disabled={!selectedId}
                onClick={() => setCurveType(type)}
                className={`flex-1 text-[9px] py-0.5 rounded border transition-colors ${
                  active
                    ? "border-lfo text-lfo"
                    : "border-border-default text-text-muted hover:border-lfo/50"
                } disabled:opacity-25 disabled:cursor-default`}
                style={active ? { backgroundColor: "rgba(136,68,255,0.15)" } : undefined}
              >
                {curveLabel}
              </button>
            );
          })}
        </div>
      )}

      {/* Rate + MOD drag */}
      <div className="flex items-center justify-center gap-2">
        <Knob
          label="Rate"
          value={lfo.rate}
          min={0.01}
          max={20}
          step={0.01}
          onChange={(v) => (synthState.lfos[index].rate = v)}
          color="var(--lfo)"
          formatValue={(v) => `${v.toFixed(2)}Hz`}
        />
        <div
          ref={dragRef as unknown as React.Ref<HTMLDivElement>}
          className="flex flex-col items-center gap-0.5 cursor-grab active:cursor-grabbing select-none transition-opacity"
          style={{ opacity: isDragging ? 0.4 : 1 }}
          title={`Drag to assign ${label} modulation`}
        >
          <GripHorizontal size={16} className="text-lfo" />
          <span className="text-[8px] text-lfo uppercase tracking-wider">MOD</span>
        </div>
      </div>
    </Panel>
  );
}
