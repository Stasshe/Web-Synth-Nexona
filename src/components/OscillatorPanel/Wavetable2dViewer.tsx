"use client";
import { computeMorphedPreviewSamples } from "@/audio/dsp/wavetable/wavetablePreview";
import { useEffect, useMemo, useRef, useState } from "react";

export type WavetableViewMode = "2d" | "spectrum";

interface Wavetable2dViewerProps {
  waveformType: number;
  framePosition: number;
  customWaveform: readonly number[] | null;
  color: string;
  spectralMorphType: number;
  spectralMorphAmount: number;
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

export function Wavetable2dViewer({
  waveformType,
  framePosition,
  customWaveform,
  color,
  spectralMorphType,
  spectralMorphAmount,
  onClick,
}: Wavetable2dViewerProps) {
  const [mode, setMode] = useState<WavetableViewMode>("2d");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const W = 128;
  const H = 64;

  const currentSamples = useMemo(
    () => computeMorphedPreviewSamples(waveformType, framePosition, customWaveform, spectralMorphType, spectralMorphAmount),
    [waveformType, framePosition, customWaveform, spectralMorphType, spectralMorphAmount],
  );

  const ghostSamples = useMemo(() => {
    if (customWaveform && customWaveform.length > 1) return [];
    const offsets = [-0.12, -0.06, 0.06, 0.12];
    return offsets.map((off) => ({
      samples: computeMorphedPreviewSamples(
        waveformType,
        Math.max(0, Math.min(1, framePosition + off)),
        null,
        spectralMorphType,
        spectralMorphAmount,
      ),
      opacity: 0.13 - Math.abs(off) * 0.4,
    }));
  }, [waveformType, framePosition, customWaveform, spectralMorphType, spectralMorphAmount]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // clearRect gives transparent pixels — CSS background of the canvas shows through
    ctx.clearRect(0, 0, W, H);

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
    } else {
      // 2D — ghost frames then main waveform (original implementation)
      for (const { samples: s, opacity } of ghostSamples) {
        ctx.beginPath();
        for (let i = 0; i < s.length; i++) {
          const x = (i / (s.length - 1)) * W;
          const y = ((-s[i] + 1) * (H - 12)) / 2 + 6;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = color;
        ctx.lineWidth = 0.8;
        ctx.globalAlpha = opacity;
        ctx.stroke();
      }

      ctx.beginPath();
      const n = currentSamples.length;
      for (let i = 0; i < n; i++) {
        const x = (i / (n - 1)) * W;
        const y = ((-currentSamples[i] + 1) * (H - 12)) / 2 + 6;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.9;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }, [currentSamples, ghostSamples, mode, color, W, H]);

  return (
    <div className="relative w-full">
      <div className="absolute top-1 right-1 flex gap-0.5 z-10">
        {(["2d", "spectrum"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={(e) => { e.stopPropagation(); setMode(m); }}
            className="text-[8px] font-bold px-1.5 py-0.5 rounded transition-all"
            style={{
              background: mode === m ? color : "rgba(0,0,0,0.4)",
              color: mode === m ? "#000" : "var(--color-text-primary, #ddd)",
              boxShadow: mode === m ? `0 0 6px ${color}40` : "none",
            }}
          >
            {m === "spectrum" ? "SP" : "2D"}
          </button>
        ))}
      </div>
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: canvas acts as visual click target */}
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="w-full rounded cursor-pointer"
        style={{
          height: H,
          display: "block",
          background: "rgba(0,0,0,0.35)", // Matched with Filter graph
        }}
        onClick={onClick}
        title="Click to edit waveform"
      />
    </div>
  );
}
