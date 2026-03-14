"use client";
import { computeMorphedPreviewSamples } from "@/audio/dsp/wavetable/wavetablePreview";
import { useEffect, useMemo, useRef, useState } from "react";

export type WavetableViewMode = "2d" | "3d" | "spectrum";

interface Wavetable3dViewerProps {
  waveformType: number;
  framePosition: number;
  customWaveform: readonly number[] | null;
  color: string;
  spectralMorphType: number;
  spectralMorphAmount: number;
  mode?: WavetableViewMode;
  onModeChange?: (mode: WavetableViewMode) => void;
  onClick?: () => void;
}

/** Compute harmonic magnitudes via DFT for the first nHarmonics partials */
function computeSpectrum(samples: ReturnType<typeof computeMorphedPreviewSamples>, nHarmonics = 64): number[] {
  const N = samples.length;
  const result: number[] = [];
  for (let k = 1; k <= nHarmonics; k++) {
    let re = 0;
    let im = 0;
    for (let n = 0; n < N; n++) {
      const angle = (2 * Math.PI * k * n) / N;
      re += samples[n] * Math.cos(angle);
      im -= samples[n] * Math.sin(angle);
    }
    result.push(Math.sqrt(re * re + im * im) / N);
  }
  return result;
}

export function Wavetable3dViewer({
  waveformType,
  framePosition,
  customWaveform,
  color,
  spectralMorphType,
  spectralMorphAmount,
  mode: modeProp,
  onModeChange,
  onClick,
}: Wavetable3dViewerProps) {
  const [internalMode, setInternalMode] = useState<WavetableViewMode>("3d");
  const mode = modeProp ?? internalMode;

  const handleSetMode = (m: WavetableViewMode) => {
    setInternalMode(m);
    onModeChange?.(m);
  };

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const currentSamples = useMemo(
    () =>
      computeMorphedPreviewSamples(
        waveformType,
        framePosition,
        customWaveform,
        spectralMorphType,
        spectralMorphAmount,
      ),
    [waveformType, framePosition, customWaveform, spectralMorphType, spectralMorphAmount],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = 128;
    const H = 80;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.fillRect(0, 0, W, H);

    if (mode === "spectrum") {
      const spectrum = computeSpectrum(currentSamples, 64);
      const maxAmp = Math.max(...spectrum, 0.001);
      const barW = W / 64;
      for (let i = 0; i < 64; i++) {
        const norm = spectrum[i] / maxAmp;
        const barH = Math.max(1, norm * (H - 6));
        ctx.globalAlpha = 0.25 + norm * 0.75;
        ctx.fillStyle = color;
        ctx.fillRect(i * barW + 0.5, H - barH - 3, barW - 1, barH);
      }
      ctx.globalAlpha = 1;
    } else if (mode === "2d") {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.9;
      const n = currentSamples.length;
      for (let i = 0; i < n; i++) {
        const x = (i / (n - 1)) * W;
        const y = ((-currentSamples[i] + 1) * (H - 16)) / 2 + 8;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else {
      // 3D perspective: draw 7 frames fanning outward from current frame
      const FRAME_OFFSETS = [-0.18, -0.12, -0.06, 0, 0.06, 0.12, 0.18];
      const Y_STEP = 7; // px per frame step above current
      const X_SHRINK = 0.04; // x-axis compression per frame step

      for (let fi = 0; fi < FRAME_OFFSETS.length; fi++) {
        const isCenter = fi === 3;
        const dist = Math.abs(fi - 3); // 0..3

        const fp = Math.max(0, Math.min(1, framePosition + FRAME_OFFSETS[fi]));
        const s = isCenter
          ? currentSamples
          : computeMorphedPreviewSamples(
              waveformType,
              fp,
              customWaveform,
              spectralMorphType,
              spectralMorphAmount,
            );

        const yOffset = (fi - 3) * Y_STEP;
        const xScale = 1 - dist * X_SHRINK;
        const xPad = ((1 - xScale) * W) / 2;

        ctx.beginPath();
        const n = s.length;
        for (let i = 0; i < n; i++) {
          const x = xPad + (i / (n - 1)) * W * xScale;
          const y = ((-s[i] + 1) * (H - 16)) / 2 + 8 + yOffset;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }

        ctx.strokeStyle = color;
        ctx.lineWidth = isCenter ? 1.5 : 0.8;
        ctx.globalAlpha = isCenter ? 0.9 : Math.max(0.06, 0.22 - dist * 0.05);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }, [currentSamples, mode, color, waveformType, framePosition, customWaveform, spectralMorphType, spectralMorphAmount]);

  const MODES: { key: WavetableViewMode; label: string }[] = [
    { key: "2d", label: "2D" },
    { key: "3d", label: "3D" },
    { key: "spectrum", label: "SP" },
  ];

  return (
    <div className="relative w-full">
      <div className="absolute top-1 right-1 flex gap-0.5 z-10">
        {MODES.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleSetMode(key);
            }}
            className="text-[7px] uppercase px-1 py-0.5 rounded transition-colors"
            style={{
              background: mode === key ? color : "rgba(0,0,0,0.4)",
              color: mode === key ? "#fff" : "var(--color-text-secondary)",
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: canvas acts as visual click target */}
      <canvas
        ref={canvasRef}
        width={128}
        height={80}
        className="w-full rounded cursor-pointer"
        style={{ height: 80, display: "block" }}
        onClick={onClick}
        title="Click to edit waveform"
      />
    </div>
  );
}
