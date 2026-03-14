"use client";
import { computeMorphedPreviewSamples } from "@/audio/dsp/wavetable/computeWavetableViewer";
import { useMemo, useState } from "react";

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

  const W = 128;
  const H = 80;

  const currentSamples = useMemo(
    () => computeMorphedPreviewSamples(waveformType, framePosition, customWaveform, spectralMorphType, spectralMorphAmount),
    [waveformType, framePosition, customWaveform, spectralMorphType, spectralMorphAmount],
  );

  // Ghost frames with vertical offset for 3D depth look (matches backup branch)
  const ghostFrames = useMemo(() => {
    if (waveformType < 0 || (customWaveform && customWaveform.length > 1)) return [];
    const offsets = [-0.15, -0.08, 0.08, 0.15];
    const ghostH = 64;
    return offsets.map((off) => {
      const s = computeMorphedPreviewSamples(
        waveformType,
        Math.max(0, Math.min(1, framePosition + off)),
        null,
        spectralMorphType,
        spectralMorphAmount,
      );
      const pts = Array.from(s, (sv, i) =>
        `${i},${((-sv + 1) * ghostH) / 2 + Math.abs(off) * 40}`
      ).join(" ");
      return { points: pts, opacity: 0.15, offsetY: off * 20 };
    });
  }, [waveformType, framePosition, customWaveform, spectralMorphType, spectralMorphAmount]);

  const mainPoints = useMemo(() =>
    Array.from(currentSamples, (s, i) =>
      `${i},${((-s + 1) * (H - 16)) / 2 + 8}`
    ).join(" "),
    [currentSamples],
  );

  const spectrum = useMemo(
    () => (mode === "spectrum" ? computeSpectrum(currentSamples, 64) : null),
    [currentSamples, mode],
  );

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
            }}
          >
            {m === "spectrum" ? "SP" : "2D"}
          </button>
        ))}
      </div>
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: SVG waveform preview acts as visual click target */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full rounded cursor-pointer"
        style={{
          height: H,
          display: "block",
          background: "color-mix(in srgb, var(--bg-darkest) 60%, transparent)",
        }}
        onClick={onClick}
      >
        <title>Click to edit waveform</title>
        {mode === "spectrum" && spectrum
          ? spectrum.map((amp, i) => {
              const maxAmp = Math.max(...spectrum, 0.001);
              const norm = amp / maxAmp;
              const barW = W / 64;
              const barH = Math.max(1, norm * (H - 6));
              return (
                <rect
                  key={i}
                  x={i * barW + 0.5}
                  y={H - barH - 3}
                  width={barW - 1}
                  height={barH}
                  style={{ fill: color }}
                  opacity={0.25 + norm * 0.75}
                />
              );
            })
          : <>
              {ghostFrames.map((g, idx) => (
                <polyline
                  key={idx}
                  points={g.points}
                  fill="none"
                  style={{ stroke: color }}
                  strokeWidth="0.8"
                  opacity={g.opacity}
                  transform={`translate(0,${g.offsetY})`}
                />
              ))}
              <polyline
                points={mainPoints}
                fill="none"
                style={{ stroke: color }}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.9"
              />
            </>
        }
      </svg>
    </div>
  );
}
