"use client";
import { ModTarget } from "@/audio/dsp/modulation/modMatrix";
import { Knob } from "@/components/ui/Knob";
import { SelectWithArrows } from "@/components/ui/SelectWithArrows";
import { DND_TYPES, type EffectSlotDragItem, type ModSourceDragItem } from "@/dnd/types";
import { useModRoutes } from "@/hooks/useModAmount";
import { audioFeedback } from "@/state/audioFeedback";
import { synthState } from "@/state/synthState";
import { GripVertical } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useRef } from "react";
import { useDrag, useDrop } from "react-dnd";
import { useSnapshot } from "valtio";

// ─── Transfer curve helper ────────────────────────────────────────────────────
const DB_MIN = -60;
const DB_MAX = 0;

function computeCompOutputDb(
  inputDb: number,
  threshold: number,
  ratio: number,
  knee: number,
): number {
  if (knee < 0.1) {
    if (inputDb <= threshold) return inputDb;
    return threshold + (inputDb - threshold) / ratio;
  }
  const halfKnee = knee / 2;
  if (inputDb <= threshold - halfKnee) return inputDb;
  if (inputDb >= threshold + halfKnee) return threshold + (inputDb - threshold) / ratio;
  const x = inputDb - threshold + halfKnee;
  const reductionDb = ((1 - 1 / ratio) * x * x) / (2 * knee);
  return inputDb - reductionDb;
}

// ─── Transfer Curve SVG ───────────────────────────────────────────────────────
const CW = 88;
const CH = 80;
const CPX = 5;
const CPY = 4;
const CPLOT_W = CW - CPX * 2;
const CPLOT_H = CH - CPY * 2;

function dbToSvgX(db: number) {
  return CPX + ((db - DB_MIN) / (DB_MAX - DB_MIN)) * CPLOT_W;
}
function dbToSvgY(db: number) {
  return CH - CPY - ((db - DB_MIN) / (DB_MAX - DB_MIN)) * CPLOT_H;
}

interface CompTransferCurveProps {
  threshold: number;
  ratio: number;
  knee: number;
  onThresholdChange: (v: number) => void;
}

function CompTransferCurve({ threshold, ratio, knee, onThresholdChange }: CompTransferCurveProps) {
  const onChangeRef = useRef(onThresholdChange);
  useEffect(() => {
    onChangeRef.current = onThresholdChange;
  });

  const dragging = useRef(false);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current || !svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const xRatio = (e.clientX - rect.left - CPX) / CPLOT_W;
      const db = DB_MIN + xRatio * (DB_MAX - DB_MIN);
      onChangeRef.current(Math.max(-60, Math.min(-1, db)));
    };
    const onUp = () => {
      dragging.current = false;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  // Build curve path
  const pts: string[] = [];
  const N = 100;
  for (let i = 0; i <= N; i++) {
    const inputDb = DB_MIN + (i / N) * (DB_MAX - DB_MIN);
    const outputDb = computeCompOutputDb(inputDb, threshold, ratio, knee);
    const x = dbToSvgX(inputDb).toFixed(1);
    const y = dbToSvgY(outputDb).toFixed(1);
    pts.push(`${i === 0 ? "M" : "L"}${x},${y}`);
  }
  const curvePath = pts.join(" ");
  const fillPath = `${curvePath} L${dbToSvgX(DB_MAX).toFixed(1)},${(CH - CPY).toFixed(1)} L${dbToSvgX(DB_MIN).toFixed(1)},${(CH - CPY).toFixed(1)} Z`;
  const refPath = `M${dbToSvgX(DB_MIN).toFixed(1)},${dbToSvgY(DB_MIN).toFixed(1)} L${dbToSvgX(DB_MAX).toFixed(1)},${dbToSvgY(DB_MAX).toFixed(1)}`;

  const threshX = dbToSvgX(threshold);
  const threshHandleY = dbToSvgY(computeCompOutputDb(threshold, threshold, ratio, knee));

  const gridDbs = [-48, -36, -24, -12];

  return (
    <svg
      ref={svgRef}
      width={CW}
      height={CH}
      style={{ flexShrink: 0, cursor: "crosshair", borderRadius: 3 }}
    >
      <rect width={CW} height={CH} fill="#0a0a12" rx="3" />
      {gridDbs.map((db) => (
        <g key={db}>
          <line
            x1={dbToSvgX(db)}
            y1={CPY}
            x2={dbToSvgX(db)}
            y2={CH - CPY}
            stroke="#ffffff0a"
            strokeWidth={0.5}
          />
          <line
            x1={CPX}
            y1={dbToSvgY(db)}
            x2={CW - CPX}
            y2={dbToSvgY(db)}
            stroke="#ffffff0a"
            strokeWidth={0.5}
          />
        </g>
      ))}
      <path d={refPath} stroke="#ffffff15" strokeWidth={0.75} strokeDasharray="3,2" fill="none" />
      <path d={fillPath} fill="color-mix(in srgb, var(--effects) 8%, transparent)" />
      <path d={curvePath} stroke="var(--effects)" strokeWidth={1.5} fill="none" />
      <line
        x1={threshX}
        y1={CPY}
        x2={threshX}
        y2={CH - CPY}
        stroke="var(--effects)"
        strokeWidth={0.75}
        strokeDasharray="2,2"
        opacity={0.55}
      />
      <circle
        cx={threshX}
        cy={threshHandleY}
        r={4}
        fill="var(--effects)"
        stroke="#0a0a12"
        strokeWidth={1.5}
        style={{ cursor: "ew-resize" }}
        onMouseDown={(e) => {
          dragging.current = true;
          e.preventDefault();
          e.stopPropagation();
        }}
      />
    </svg>
  );
}

// ─── GR Meter ─────────────────────────────────────────────────────────────────
function CompGRMeter() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const smoothGR = useRef(0);

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

    const target = audioFeedback.compGR;
    smoothGR.current += (target > smoothGR.current ? 0.5 : 0.05) * (target - smoothGR.current);

    const w = canvas.width;
    const h = canvas.height;
    const MAX_GR = 24;
    const norm = Math.min(1, Math.max(0, smoothGR.current / MAX_GR));
    const barH = norm * h;

    ctx.fillStyle = "#0a0a12";
    ctx.fillRect(0, 0, w, h);

    if (barH > 0.5) {
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, "#ef4444");
      grad.addColorStop(0.4, "#eab308");
      grad.addColorStop(1, "#44cccc");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, barH);
    }

    rafRef.current = requestAnimationFrame(draw);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      width={8}
      height={CH}
      className="rounded"
      style={{ border: "1px solid var(--border)", flexShrink: 0 }}
    />
  );
}

// ─── Drag/Drop strip wrapper ──────────────────────────────────────────────────
function useEffectsModDrop() {
  return useCallback(
    (target: ModTarget) => (item: ModSourceDragItem) => {
      synthState.modulations.push({ source: item.source, target, amount: 0.5 });
    },
    [],
  );
}

interface EffectStripProps {
  name: string;
  index: number;
  enabled: boolean;
  onToggle: () => void;
  children: ReactNode;
}

function EffectStrip({ name, index, enabled, onToggle, children }: EffectStripProps) {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, dragRef, previewRef] = useDrag(
    () => ({
      type: DND_TYPES.EFFECT_SLOT,
      item: { effectName: name, index } as EffectSlotDragItem,
      collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    }),
    [name, index],
  );

  const [{ isOver }, dropRef] = useDrop(
    () => ({
      accept: DND_TYPES.EFFECT_SLOT,
      hover: (item: EffectSlotDragItem) => {
        if (item.index === index) return;
        const order = [...synthState.effectsOrder];
        const dragIdx = order.indexOf(item.effectName);
        const hoverIdx = order.indexOf(name);
        if (dragIdx < 0 || hoverIdx < 0) return;
        order.splice(dragIdx, 1);
        order.splice(hoverIdx, 0, item.effectName);
        synthState.effectsOrder = order;
        item.index = hoverIdx;
      },
      collect: (monitor) => ({ isOver: monitor.isOver() }),
    }),
    [name, index],
  );

  // Combine refs
  previewRef(dropRef(ref));

  return (
    <div
      ref={ref}
      className="flex items-stretch rounded-lg border overflow-hidden transition-all"
      style={{
        opacity: isDragging ? 0.4 : 1,
        borderColor: isOver ? "var(--effects)" : "var(--border)",
        background: "var(--bg-panel)",
      }}
    >
      {/* Drag handle */}
      <div
        ref={(node) => {
          dragRef(node);
        }}
        className="flex items-center px-1 cursor-grab active:cursor-grabbing shrink-0"
        style={{ borderRight: "1px solid var(--border)" }}
      >
        <GripVertical size={12} style={{ color: "var(--text-muted)" }} />
      </div>

      {/* Header: on/off dot + name */}
      <div className="flex items-center gap-1.5 px-2 shrink-0 min-w-[80px]">
        <button
          type="button"
          onClick={onToggle}
          className="w-[7px] h-[7px] rounded-full shrink-0 cursor-pointer transition-all hover:scale-125"
          style={{
            backgroundColor: enabled ? "var(--effects)" : "var(--text-muted)",
            boxShadow: enabled ? "0 0 6px var(--effects)" : "none",
          }}
        />
        <span
          className="text-[9px] font-semibold tracking-wider uppercase"
          style={{
            color: enabled ? "var(--text-primary)" : "var(--text-muted)",
          }}
        >
          {name.length > 6 ? name.slice(0, 5) + "." : name}
        </span>
      </div>

      {/* Controls */}
      <div
        className="flex items-center gap-1 px-2 py-1.5 flex-1 min-w-0"
        style={{ opacity: enabled ? 1 : 0.3, pointerEvents: enabled ? "auto" : "none" }}
      >
        {children}
      </div>
    </div>
  );
}

// ─── Individual effect controls ───────────────────────────────────────────────
const DIST_MODES = ["Soft", "Hard", "Fold", "Bits", "Tube", "Scrm", "Rect", "Down"];
const DIST_MODE_OPTIONS = DIST_MODES.map((m, i) => ({ value: String(i), label: m }));

function DistortionControls() {
  const snap = useSnapshot(synthState);
  const d = snap.effects.distortion;
  const handleModDrop = useEffectsModDrop();
  const modDrive = useModRoutes(ModTarget.DIST_DRIVE);
  const modMix = useModRoutes(ModTarget.DIST_MIX);
  return (
    <>
      <SelectWithArrows
        value={String(d.mode)}
        options={DIST_MODE_OPTIONS}
        onChange={(v) => (synthState.effects.distortion.mode = Number(v))}
        accentColor="var(--effects)"
        className="mr-1 shrink-0 w-32"
      />
      <Knob
        label="Drive"
        value={d.drive}
        min={1}
        max={100}
        step={0.1}
        onChange={(v) => (synthState.effects.distortion.drive = v)}
        color="var(--effects)"
        formatValue={(v) => `${v.toFixed(1)}`}
        size={28}
        modRoutes={modDrive}
        onModDrop={handleModDrop(ModTarget.DIST_DRIVE)}
        modTarget={ModTarget.DIST_DRIVE}
      />
      <Knob
        label="Tone"
        value={d.tone}
        min={0}
        max={1}
        onChange={(v) => (synthState.effects.distortion.tone = v)}
        color="var(--effects)"
        size={28}
      />
      <Knob
        label="Mix"
        value={d.mix}
        min={0}
        max={1}
        onChange={(v) => (synthState.effects.distortion.mix = v)}
        color="var(--effects)"
        size={28}
        modRoutes={modMix}
        onModDrop={handleModDrop(ModTarget.DIST_MIX)}
        modTarget={ModTarget.DIST_MIX}
      />
    </>
  );
}

function CompressorControls() {
  const snap = useSnapshot(synthState);
  const c = snap.effects.compressor;

  return (
    <div className="flex items-center gap-2 flex-1 min-w-0">
      {/* Transfer curve graph */}
      <CompTransferCurve
        threshold={c.threshold}
        ratio={c.ratio}
        knee={c.knee}
        onThresholdChange={(v) => {
          synthState.effects.compressor.threshold = Math.round(v * 2) / 2;
        }}
      />
      {/* GR meter */}
      <CompGRMeter />
      {/* Knob row */}
      <div className="flex items-center gap-0.5 flex-wrap">
        <Knob
          label="Thresh"
          value={c.threshold}
          min={-60}
          max={-1}
          step={0.5}
          onChange={(v) => (synthState.effects.compressor.threshold = v)}
          color="var(--effects)"
          formatValue={(v) => `${v.toFixed(0)}dB`}
          size={28}
        />
        <Knob
          label="Ratio"
          value={c.ratio}
          min={1}
          max={20}
          step={0.5}
          onChange={(v) => (synthState.effects.compressor.ratio = v)}
          color="var(--effects)"
          formatValue={(v) => `${v.toFixed(1)}:1`}
          size={28}
        />
        <Knob
          label="Knee"
          value={c.knee}
          min={0}
          max={24}
          step={0.5}
          onChange={(v) => {
            synthState.effects.compressor.knee = v;
          }}
          color="var(--effects)"
          formatValue={(v) => `${v.toFixed(0)}dB`}
          size={28}
        />
        <Knob
          label="Atk"
          value={c.attack}
          min={0.001}
          max={0.5}
          step={0.001}
          onChange={(v) => (synthState.effects.compressor.attack = v)}
          color="var(--effects)"
          formatValue={(v) => `${(v * 1000).toFixed(0)}ms`}
          size={28}
        />
        <Knob
          label="Rel"
          value={c.release}
          min={0.01}
          max={2}
          step={0.01}
          onChange={(v) => (synthState.effects.compressor.release = v)}
          color="var(--effects)"
          formatValue={(v) => `${(v * 1000).toFixed(0)}ms`}
          size={28}
        />
        <Knob
          label="Gain"
          value={c.makeup}
          min={0}
          max={36}
          step={0.5}
          onChange={(v) => (synthState.effects.compressor.makeup = v)}
          color="var(--effects)"
          formatValue={(v) => `+${v.toFixed(0)}dB`}
          size={28}
        />
        <Knob
          label="Mix"
          value={c.mix}
          min={0}
          max={1}
          onChange={(v) => (synthState.effects.compressor.mix = v)}
          color="var(--effects)"
          size={28}
        />
      </div>
    </div>
  );
}

function ChorusControls() {
  const snap = useSnapshot(synthState);
  const c = snap.effects.chorus;
  const handleModDrop = useEffectsModDrop();
  const modRate = useModRoutes(ModTarget.CHORUS_RATE);
  const modDepth = useModRoutes(ModTarget.CHORUS_DEPTH);
  const modMix = useModRoutes(ModTarget.CHORUS_MIX);
  return (
    <>
      <Knob
        label="Rate"
        value={c.rate}
        min={0.1}
        max={5}
        step={0.01}
        onChange={(v) => (synthState.effects.chorus.rate = v)}
        color="var(--effects)"
        formatValue={(v) => `${v.toFixed(1)}Hz`}
        size={28}
        modRoutes={modRate}
        onModDrop={handleModDrop(ModTarget.CHORUS_RATE)}
        modTarget={ModTarget.CHORUS_RATE}
      />
      <Knob
        label="Depth"
        value={c.depth}
        min={0}
        max={1}
        onChange={(v) => (synthState.effects.chorus.depth = v)}
        color="var(--effects)"
        size={28}
        modRoutes={modDepth}
        onModDrop={handleModDrop(ModTarget.CHORUS_DEPTH)}
        modTarget={ModTarget.CHORUS_DEPTH}
      />
      <Knob
        label="Mix"
        value={c.mix}
        min={0}
        max={1}
        onChange={(v) => (synthState.effects.chorus.mix = v)}
        color="var(--effects)"
        size={28}
        modRoutes={modMix}
        onModDrop={handleModDrop(ModTarget.CHORUS_MIX)}
        modTarget={ModTarget.CHORUS_MIX}
      />
    </>
  );
}

function FlangerControls() {
  const snap = useSnapshot(synthState);
  const f = snap.effects.flanger;
  const handleModDrop = useEffectsModDrop();
  const modRate = useModRoutes(ModTarget.FLANGER_RATE);
  const modDepth = useModRoutes(ModTarget.FLANGER_DEPTH);
  const modFeedback = useModRoutes(ModTarget.FLANGER_FEEDBACK);
  const modMix = useModRoutes(ModTarget.FLANGER_MIX);
  return (
    <>
      <Knob
        label="Rate"
        value={f.rate}
        min={0.01}
        max={10}
        step={0.01}
        onChange={(v) => (synthState.effects.flanger.rate = v)}
        color="var(--effects)"
        formatValue={(v) => `${v.toFixed(2)}Hz`}
        size={28}
        modRoutes={modRate}
        onModDrop={handleModDrop(ModTarget.FLANGER_RATE)}
        modTarget={ModTarget.FLANGER_RATE}
      />
      <Knob
        label="Depth"
        value={f.depth}
        min={0}
        max={1}
        onChange={(v) => (synthState.effects.flanger.depth = v)}
        color="var(--effects)"
        size={28}
        modRoutes={modDepth}
        onModDrop={handleModDrop(ModTarget.FLANGER_DEPTH)}
        modTarget={ModTarget.FLANGER_DEPTH}
      />
      <Knob
        label="Fdbk"
        value={f.feedback}
        min={0}
        max={0.95}
        onChange={(v) => (synthState.effects.flanger.feedback = v)}
        color="var(--effects)"
        size={28}
        modRoutes={modFeedback}
        onModDrop={handleModDrop(ModTarget.FLANGER_FEEDBACK)}
        modTarget={ModTarget.FLANGER_FEEDBACK}
      />
      <Knob
        label="Mix"
        value={f.mix}
        min={0}
        max={1}
        onChange={(v) => (synthState.effects.flanger.mix = v)}
        color="var(--effects)"
        size={28}
        modRoutes={modMix}
        onModDrop={handleModDrop(ModTarget.FLANGER_MIX)}
        modTarget={ModTarget.FLANGER_MIX}
      />
    </>
  );
}

function PhaserControls() {
  const snap = useSnapshot(synthState);
  const p = snap.effects.phaser;
  const handleModDrop = useEffectsModDrop();
  const modRate = useModRoutes(ModTarget.PHASER_RATE);
  const modDepth = useModRoutes(ModTarget.PHASER_DEPTH);
  const modFeedback = useModRoutes(ModTarget.PHASER_FEEDBACK);
  const modMix = useModRoutes(ModTarget.PHASER_MIX);
  return (
    <>
      <Knob
        label="Rate"
        value={p.rate}
        min={0.01}
        max={10}
        step={0.01}
        onChange={(v) => (synthState.effects.phaser.rate = v)}
        color="var(--effects)"
        formatValue={(v) => `${v.toFixed(2)}Hz`}
        size={28}
        modRoutes={modRate}
        onModDrop={handleModDrop(ModTarget.PHASER_RATE)}
        modTarget={ModTarget.PHASER_RATE}
      />
      <Knob
        label="Depth"
        value={p.depth}
        min={0}
        max={1}
        onChange={(v) => (synthState.effects.phaser.depth = v)}
        color="var(--effects)"
        size={28}
        modRoutes={modDepth}
        onModDrop={handleModDrop(ModTarget.PHASER_DEPTH)}
        modTarget={ModTarget.PHASER_DEPTH}
      />
      <Knob
        label="Fdbk"
        value={p.feedback}
        min={0}
        max={0.95}
        onChange={(v) => (synthState.effects.phaser.feedback = v)}
        color="var(--effects)"
        size={28}
        modRoutes={modFeedback}
        onModDrop={handleModDrop(ModTarget.PHASER_FEEDBACK)}
        modTarget={ModTarget.PHASER_FEEDBACK}
      />
      <Knob
        label="Mix"
        value={p.mix}
        min={0}
        max={1}
        onChange={(v) => (synthState.effects.phaser.mix = v)}
        color="var(--effects)"
        size={28}
        modRoutes={modMix}
        onModDrop={handleModDrop(ModTarget.PHASER_MIX)}
        modTarget={ModTarget.PHASER_MIX}
      />
    </>
  );
}

function DelayControls() {
  const snap = useSnapshot(synthState);
  const d = snap.effects.delay;
  const handleModDrop = useEffectsModDrop();
  const modTime = useModRoutes(ModTarget.DELAY_TIME);
  const modFeedback = useModRoutes(ModTarget.DELAY_FEEDBACK);
  const modMix = useModRoutes(ModTarget.DELAY_MIX);
  return (
    <>
      <Knob
        label="Time"
        value={d.time}
        min={0.01}
        max={2}
        step={0.01}
        onChange={(v) => (synthState.effects.delay.time = v)}
        color="var(--effects)"
        formatValue={(v) => `${(v * 1000).toFixed(0)}ms`}
        size={28}
        modRoutes={modTime}
        onModDrop={handleModDrop(ModTarget.DELAY_TIME)}
        modTarget={ModTarget.DELAY_TIME}
      />
      <Knob
        label="Fdbk"
        value={d.feedback}
        min={0}
        max={0.95}
        onChange={(v) => (synthState.effects.delay.feedback = v)}
        color="var(--effects)"
        size={28}
        modRoutes={modFeedback}
        onModDrop={handleModDrop(ModTarget.DELAY_FEEDBACK)}
        modTarget={ModTarget.DELAY_FEEDBACK}
      />
      <Knob
        label="Mix"
        value={d.mix}
        min={0}
        max={1}
        onChange={(v) => (synthState.effects.delay.mix = v)}
        color="var(--effects)"
        size={28}
        modRoutes={modMix}
        onModDrop={handleModDrop(ModTarget.DELAY_MIX)}
        modTarget={ModTarget.DELAY_MIX}
      />
    </>
  );
}

function ReverbControls() {
  const snap = useSnapshot(synthState);
  const r = snap.effects.reverb;
  const handleModDrop = useEffectsModDrop();
  const modDecay = useModRoutes(ModTarget.REVERB_DECAY);
  const modMix = useModRoutes(ModTarget.REVERB_MIX);
  return (
    <>
      <Knob
        label="Decay"
        value={r.decay}
        min={0.1}
        max={0.99}
        onChange={(v) => (synthState.effects.reverb.decay = v)}
        color="var(--effects)"
        size={28}
        modRoutes={modDecay}
        onModDrop={handleModDrop(ModTarget.REVERB_DECAY)}
        modTarget={ModTarget.REVERB_DECAY}
      />
      <Knob
        label="Mix"
        value={r.mix}
        min={0}
        max={1}
        onChange={(v) => (synthState.effects.reverb.mix = v)}
        color="var(--effects)"
        size={28}
        modRoutes={modMix}
        onModDrop={handleModDrop(ModTarget.REVERB_MIX)}
        modTarget={ModTarget.REVERB_MIX}
      />
    </>
  );
}

function EQControls() {
  const snap = useSnapshot(synthState);
  const eq = snap.effects.eq;
  const handleModDrop = useEffectsModDrop();
  const modLow = useModRoutes(ModTarget.EQ_LOW);
  const modMid = useModRoutes(ModTarget.EQ_MID);
  const modHigh = useModRoutes(ModTarget.EQ_HIGH);
  return (
    <>
      <Knob
        label="Low"
        value={eq.lowGain}
        min={-12}
        max={12}
        step={0.5}
        onChange={(v) => (synthState.effects.eq.lowGain = v)}
        color="var(--effects)"
        formatValue={(v) => `${v > 0 ? "+" : ""}${v.toFixed(0)}dB`}
        size={28}
        modRoutes={modLow}
        onModDrop={handleModDrop(ModTarget.EQ_LOW)}
        modTarget={ModTarget.EQ_LOW}
      />
      <Knob
        label="Mid"
        value={eq.midGain}
        min={-12}
        max={12}
        step={0.5}
        onChange={(v) => (synthState.effects.eq.midGain = v)}
        color="var(--effects)"
        formatValue={(v) => `${v > 0 ? "+" : ""}${v.toFixed(0)}dB`}
        size={28}
        modRoutes={modMid}
        onModDrop={handleModDrop(ModTarget.EQ_MID)}
        modTarget={ModTarget.EQ_MID}
      />
      <Knob
        label="High"
        value={eq.highGain}
        min={-12}
        max={12}
        step={0.5}
        onChange={(v) => (synthState.effects.eq.highGain = v)}
        color="var(--effects)"
        formatValue={(v) => `${v > 0 ? "+" : ""}${v.toFixed(0)}dB`}
        size={28}
        modRoutes={modHigh}
        onModDrop={handleModDrop(ModTarget.EQ_HIGH)}
        modTarget={ModTarget.EQ_HIGH}
      />
      <Knob
        label="Mix"
        value={eq.mix}
        min={0}
        max={1}
        onChange={(v) => (synthState.effects.eq.mix = v)}
        color="var(--effects)"
        size={28}
      />
    </>
  );
}

// ─── Map effect names to controls and toggle logic ────────────────────────────
const EFFECT_CONTROLS: Record<string, () => ReactNode> = {
  distortion: () => <DistortionControls />,
  compressor: () => <CompressorControls />,
  chorus: () => <ChorusControls />,
  flanger: () => <FlangerControls />,
  phaser: () => <PhaserControls />,
  delay: () => <DelayControls />,
  reverb: () => <ReverbControls />,
  eq: () => <EQControls />,
};

const DEFAULT_MIX: Record<string, number> = {
  distortion: 0.5,
  compressor: 1,
  chorus: 0.4,
  flanger: 0.5,
  phaser: 0.5,
  delay: 0.3,
  reverb: 0.3,
  eq: 1,
};

function getMix(name: string, snap: ReturnType<typeof useSnapshot<typeof synthState>>): number {
  const fx = snap.effects as Record<string, Record<string, number>>;
  return fx[name]?.mix ?? 0;
}

function toggleEffect(name: string, currentMix: number) {
  const fx = synthState.effects as Record<string, Record<string, number>>;
  if (fx[name]) {
    fx[name].mix = currentMix > 0 ? 0 : (DEFAULT_MIX[name] ?? 0.5);
  }
}

export function EffectsPage() {
  const snap = useSnapshot(synthState);
  const order = snap.effectsOrder;

  return (
    <div className="flex flex-col gap-1 p-1">
      {order.map((name, idx) => {
        const mix = getMix(name, snap);
        const controls = EFFECT_CONTROLS[name];
        if (!controls) return null;
        return (
          <EffectStrip
            key={name}
            name={name}
            index={idx}
            enabled={mix > 0}
            onToggle={() => toggleEffect(name, mix)}
          >
            {controls()}
          </EffectStrip>
        );
      })}
    </div>
  );
}
