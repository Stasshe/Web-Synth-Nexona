"use client";
import { DND_TYPES, type ModSourceDragItem } from "@/dnd/types";
import type { ModRouteInfo } from "@/hooks/useModAmount";
import { synthState } from "@/state/synthState";
import { useCallback, useRef } from "react";
import { useDrop } from "react-dnd";

const SOURCE_LABELS: Record<number, string> = {
  0: "L1",
  1: "L2",
  2: "AE",
  3: "FE",
  4: "Vl",
  5: "Ky",
  6: "M1",
  7: "M2",
  8: "M3",
  9: "M4",
};

interface KnobProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  label: string;
  onChange: (value: number) => void;
  size?: number;
  color?: string;
  modRoutes?: ModRouteInfo[];
  formatValue?: (v: number) => string;
  onModDrop?: (item: ModSourceDragItem) => void;
}

export function Knob({
  value,
  min,
  max,
  step = 0.01,
  label,
  onChange,
  size = 48,
  color = "var(--accent-blue)",
  modRoutes,
  formatValue,
  onModDrop,
}: KnobProps) {
  const dragRef = useRef<{ startY: number; startValue: number } | null>(null);
  const modAmount = modRoutes ? modRoutes.reduce((sum, r) => sum + r.amount, 0) : 0;

  const [{ isOver, canDrop }, dropRef] = useDrop(
    () => ({
      accept: DND_TYPES.MOD_SOURCE,
      drop: (item: ModSourceDragItem) => {
        onModDrop?.(item);
      },
      canDrop: () => !!onModDrop,
      collect: (monitor) => ({
        isOver: monitor.isOver(),
        canDrop: monitor.canDrop(),
      }),
    }),
    [onModDrop],
  );

  const normalize = (v: number) => (v - min) / (max - min);

  const startAngle = -135;
  const endAngle = 135;
  const range = endAngle - startAngle;
  const normalized = normalize(value);
  const angle = startAngle + normalized * range;

  const r = size / 2 - 4;
  const cx = size / 2;
  const cy = size / 2;

  const arcPath = (startDeg: number, endDeg: number) => {
    const s = ((startDeg - 90) * Math.PI) / 180;
    const e = ((endDeg - 90) * Math.PI) / 180;
    const x1 = cx + r * Math.cos(s);
    const y1 = cy + r * Math.sin(s);
    const x2 = cx + r * Math.cos(e);
    const y2 = cy + r * Math.sin(e);
    const largeArc = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
  };

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      dragRef.current = { startY: e.clientY, startValue: value };
    },
    [value],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current) return;
      const dy = dragRef.current.startY - e.clientY;
      const sensitivity = e.shiftKey ? 600 : 200;
      const delta = (dy / sensitivity) * (max - min);
      const newVal = Math.min(max, Math.max(min, dragRef.current.startValue + delta));
      const stepped = Math.round(newVal / step) * step;
      onChange(stepped);
    },
    [min, max, step, onChange],
  );

  const handlePointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  const handleDoubleClick = useCallback(() => {
    const defaultVal = min + (max - min) * 0.5;
    onChange(Math.round(defaultVal / step) * step);
  }, [min, max, step, onChange]);

  const displayValue = formatValue
    ? formatValue(value)
    : value >= 1000
      ? `${(value / 1000).toFixed(1)}k`
      : value.toFixed(step >= 1 ? 0 : step >= 0.1 ? 1 : 2);

  // Mod indicator ring
  const modEnd = Math.min(1, Math.max(0, normalized + modAmount));
  const modAngle = startAngle + modEnd * range;
  const modArcStart = modAmount >= 0 ? angle : modAngle;
  const modArcEnd = modAmount >= 0 ? modAngle : angle;

  const showDropHighlight = isOver && canDrop;

  return (
    <div
      ref={dropRef as unknown as React.Ref<HTMLDivElement>}
      className="flex flex-col items-center gap-0.5 select-none"
    >
      <svg
        width={size}
        height={size}
        className="cursor-pointer"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        style={{ touchAction: "none" }}
      >
        {showDropHighlight && (
          <circle
            cx={cx}
            cy={cy}
            r={r + 2}
            fill="none"
            stroke="var(--lfo)"
            strokeWidth={2}
            opacity={0.6}
          />
        )}
        <path
          d={arcPath(startAngle, endAngle)}
          fill="none"
          stroke="var(--knob-track)"
          strokeWidth={3}
          strokeLinecap="round"
        />
        {normalized > 0.001 && (
          <path
            d={arcPath(startAngle, angle)}
            fill="none"
            stroke={color}
            strokeWidth={3}
            strokeLinecap="round"
          />
        )}
        {modAmount !== 0 && modArcEnd > modArcStart + 0.1 && (
          <path
            d={arcPath(modArcStart, modArcEnd)}
            fill="none"
            stroke="var(--lfo)"
            strokeWidth={3}
            strokeLinecap="round"
            opacity={0.4}
          />
        )}
        <circle
          cx={cx + (r - 6) * Math.cos(((angle - 90) * Math.PI) / 180)}
          cy={cy + (r - 6) * Math.sin(((angle - 90) * Math.PI) / 180)}
          r={2.5}
          fill={color}
        />
        <circle
          cx={cx}
          cy={cy}
          r={r - 10}
          fill="var(--bg-surface)"
          stroke="var(--border-default)"
          strokeWidth={1}
        />
      </svg>
      <span className="text-[10px] text-text-secondary">{displayValue}</span>
      <span className="text-[9px] text-text-muted uppercase tracking-wider">{label}</span>
      {/* Mini mod route knobs */}
      {modRoutes && modRoutes.length > 0 && (
        <div className="flex gap-1">
          {modRoutes.map((route) => (
            <ModRouteTag key={route.index} route={route} />
          ))}
        </div>
      )}
    </div>
  );
}

function ModRouteTag({ route }: { route: ModRouteInfo }) {
  const dragRef = useRef<{ startY: number; startValue: number } | null>(null);
  const sz = 24;
  const kr = sz / 2 - 3;
  const kcx = sz / 2;
  const kcy = sz / 2;
  const sA = -135;
  const eA = 135;
  const rng = eA - sA;
  const norm = (route.amount + 1) / 2; // -1..1 → 0..1
  const ang = sA + norm * rng;

  const miniArc = (s: number, e: number) => {
    const sr = ((s - 90) * Math.PI) / 180;
    const er = ((e - 90) * Math.PI) / 180;
    const x1 = kcx + kr * Math.cos(sr);
    const y1 = kcy + kr * Math.sin(sr);
    const x2 = kcx + kr * Math.cos(er);
    const y2 = kcy + kr * Math.sin(er);
    const la = Math.abs(e - s) > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${kr} ${kr} 0 ${la} 1 ${x2} ${y2}`;
  };

  // Arc from center (0) to current value
  const centerAngle = sA + 0.5 * rng; // 0 position
  const arcStart = route.amount >= 0 ? centerAngle : ang;
  const arcEnd = route.amount >= 0 ? ang : centerAngle;

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      dragRef.current = { startY: e.clientY, startValue: route.amount };
    },
    [route.amount],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current) return;
      const dy = dragRef.current.startY - e.clientY;
      const sensitivity = e.shiftKey ? 400 : 150;
      const delta = (dy / sensitivity) * 2; // range is -1..1 = 2
      const newVal = Math.min(1, Math.max(-1, dragRef.current.startValue + delta));
      const stepped = Math.round(newVal / 0.05) * 0.05;
      const r = synthState.modulations[route.index];
      if (r) r.amount = stepped;
    },
    [route.index],
  );

  const handlePointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  const handleDoubleClick = useCallback(() => {
    const r = synthState.modulations[route.index];
    if (r) r.amount = 0;
  }, [route.index]);

  const handleRemove = useCallback(() => {
    synthState.modulations.splice(route.index, 1);
  }, [route.index]);

  return (
    <div className="flex flex-col items-center gap-0">
      <svg
        width={sz}
        height={sz}
        className="cursor-pointer"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        style={{ touchAction: "none" }}
      >
        <path
          d={miniArc(sA, eA)}
          fill="none"
          stroke="var(--knob-track)"
          strokeWidth={2}
          strokeLinecap="round"
        />
        {Math.abs(route.amount) > 0.01 && arcEnd > arcStart + 0.1 && (
          <path
            d={miniArc(arcStart, arcEnd)}
            fill="none"
            stroke="var(--lfo)"
            strokeWidth={2}
            strokeLinecap="round"
          />
        )}
        <circle
          cx={kcx + (kr - 4) * Math.cos(((ang - 90) * Math.PI) / 180)}
          cy={kcy + (kr - 4) * Math.sin(((ang - 90) * Math.PI) / 180)}
          r={1.5}
          fill="var(--lfo)"
        />
      </svg>
      <span className="text-[7px] text-lfo font-bold leading-none">
        {SOURCE_LABELS[route.source] ?? "?"}
      </span>
      <button
        type="button"
        onClick={handleRemove}
        className="text-[7px] text-text-muted hover:text-accent-red cursor-pointer leading-none"
      >
        x
      </button>
    </div>
  );
}
