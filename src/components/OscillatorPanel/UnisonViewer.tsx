"use client";
import { lerp } from "@/audio/dsp/utils/interpolation";
import { useMemo } from "react";

interface UnisonViewerProps {
  count: number;
  detune: number;        // 0-1 normalized
  blend: number;         // 0-1
  stackType: number;
  detunePower: number;   // -5 to +5
  detuneRange: number;   // 0-48 semitones
  stereoSpread: number;  // 0-1
  color: string;
}

const K_CENTER_LOW = 0.32;
const K_DETUNED_HIGH = 0.7;

/** Compute voice positions and amplitudes matching the unisonEngine _buildVoices logic */
function buildVoiceDisplay(
  n: number,
  detune: number,
  stereoSpread: number,
  blend: number,
  detunePower: number,
  detuneRange: number,
): { pan: number; amp: number }[] {
  const count = Math.max(1, Math.round(n));
  const totalDetuneCents = detune * detuneRange * 100;
  const centerAmp = lerp(1.0, K_CENTER_LOW, blend);
  const detunedAmp = lerp(0, K_DETUNED_HIGH, blend);
  const centerIdx = Math.floor((count - 1) / 2);

  let totalPower = 0;
  for (let i = 0; i < count; i++) {
    const a = i === centerIdx ? centerAmp : detunedAmp;
    totalPower += a * a;
  }
  const normFactor = totalPower > 0 ? 1 / Math.sqrt(totalPower) : 1;

  const results: { pan: number; amp: number }[] = [];
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0 : (2 * i) / (count - 1) - 1;

    let shapedT: number;
    if (detunePower === 0) {
      shapedT = 0;
    } else if (detunePower > 0) {
      shapedT = Math.sign(t) * Math.pow(Math.abs(t), detunePower);
    } else {
      const absPow = Math.max(0.01, Math.abs(detunePower));
      shapedT = Math.abs(t) > 0 ? Math.sign(t) * (1 - Math.pow(1 - Math.abs(t), absPow)) : 0;
    }

    const detuneCents = shapedT * totalDetuneCents * 0.5;
    // Normalize to ±1 in display space (1.0 = max spread)
    const maxCents = Math.max(totalDetuneCents * 0.5, 1);
    const pan = stereoSpread > 0 ? (detuneCents / maxCents) * stereoSpread : 0;
    const amp = (i === centerIdx ? centerAmp : detunedAmp) * normFactor;

    results.push({ pan, amp });
  }
  return results;
}

export function UnisonViewer({ count, detune, blend, detunePower, detuneRange, stereoSpread, color }: UnisonViewerProps) {
  const W = 128;
  const H = 36;
  const barW = 4;
  const maxBarH = H - 6;

  const voices = useMemo(
    () => buildVoiceDisplay(count, detune, stereoSpread, blend, detunePower, detuneRange),
    [count, detune, stereoSpread, blend, detunePower, detuneRange],
  );

  // Scale pan from [-1, 1] → [barMargin, W - barMargin]
  const margin = 8;
  const usableW = W - margin * 2;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      style={{ height: H, display: "block" }}
      aria-label="Unison voice spread"
    >
      <title>Unison voice positions</title>
      {/* Center line */}
      <line
        x1={W / 2}
        y1={2}
        x2={W / 2}
        y2={H - 2}
        stroke={color}
        strokeOpacity={0.12}
        strokeWidth={0.5}
        strokeDasharray="2 2"
      />
      {voices.map((v, i) => {
        const cx = margin + ((v.pan + 1) / 2) * usableW;
        const barH = Math.max(3, v.amp * maxBarH);
        const y = H - 3 - barH;
        return (
          <rect
            key={i}
            x={cx - barW / 2}
            y={y}
            width={barW}
            height={barH}
            rx={1}
            fill={color}
            opacity={0.3 + v.amp * 0.7}
          />
        );
      })}
    </svg>
  );
}
