"use client";
import { useCallback, useRef } from "react";

interface KnobProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  label: string;
  onChange: (value: number) => void;
  size?: number;
  color?: string;
  modAmount?: number;
  formatValue?: (v: number) => string;
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
  modAmount = 0,
  formatValue,
}: KnobProps) {
  const dragRef = useRef<{ startY: number; startValue: number } | null>(null);

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
    const largeArc = endDeg - startDeg > 180 ? 1 : 0;
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

  return (
    <div className="flex flex-col items-center gap-1 select-none">
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
        {/* Background track */}
        <path
          d={arcPath(startAngle, endAngle)}
          fill="none"
          stroke="var(--knob-track)"
          strokeWidth={3}
          strokeLinecap="round"
        />
        {/* Value arc */}
        {normalized > 0.001 && (
          <path
            d={arcPath(startAngle, angle)}
            fill="none"
            stroke={color}
            strokeWidth={3}
            strokeLinecap="round"
          />
        )}
        {/* Mod indicator */}
        {modAmount !== 0 && (
          <path
            d={arcPath(angle, modAngle)}
            fill="none"
            stroke={color}
            strokeWidth={3}
            strokeLinecap="round"
            opacity={0.3}
          />
        )}
        {/* Dot indicator */}
        <circle
          cx={cx + (r - 6) * Math.cos(((angle - 90) * Math.PI) / 180)}
          cy={cy + (r - 6) * Math.sin(((angle - 90) * Math.PI) / 180)}
          r={2.5}
          fill={color}
        />
        {/* Center circle */}
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
    </div>
  );
}
