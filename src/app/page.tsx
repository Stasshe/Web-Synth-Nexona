"use client";

import type { ModRoute } from "@/audio/dsp/modulation/modMatrix";
import { type SynthNode, createSynthNode } from "@/audio/worklet/node";
import { EffectsPanel } from "@/components/EffectsPanel";
import { EnvelopePanel } from "@/components/EnvelopePanel";
import { FilterPanel } from "@/components/FilterPanel";
import { Keyboard } from "@/components/Keyboard";
import { LfoPanel } from "@/components/LfoPanel";
import { ModulationPanel } from "@/components/ModulationPanel";
import { OscillatorPanel } from "@/components/OscillatorPanel";
import { SubNoisePanel } from "@/components/SubNoisePanel";
import { Visualizer } from "@/components/Visualizer";
import { Knob } from "@/components/ui/Knob";
import { bindStateToSAB, synthState } from "@/state/synthState";
import { Power, Volume2 } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { useSnapshot } from "valtio";

export default function Home() {
  const [started, setStarted] = useState(false);
  const synthRef = useRef<SynthNode | null>(null);
  const unbindRef = useRef<(() => void) | null>(null);
  const [waveformData, setWaveformData] = useState<Float32Array | null>(null);
  const snap = useSnapshot(synthState);

  const handleStart = useCallback(async () => {
    if (started) return;
    const ctx = new AudioContext({ sampleRate: 48000 });
    const synth = await createSynthNode(ctx);
    synthRef.current = synth;
    unbindRef.current = bindStateToSAB(synth.sabView);
    synth.onWaveformData(setWaveformData);
    setStarted(true);
  }, [started]);

  const handleNoteOn = useCallback((note: number, velocity: number) => {
    synthRef.current?.noteOn(note, velocity);
  }, []);

  const handleNoteOff = useCallback((note: number) => {
    synthRef.current?.noteOff(note);
  }, []);

  const handleModRoutesChange = useCallback((routes: ModRoute[]) => {
    synthRef.current?.setModRoutes(routes);
  }, []);

  if (!started) {
    return (
      <main className="flex items-center justify-center min-h-screen">
        <button
          type="button"
          onClick={handleStart}
          className="flex items-center gap-3 px-8 py-4 bg-bg-surface border border-border-default rounded-xl
                     hover:border-accent-blue hover:bg-bg-hover transition-all cursor-pointer text-text-primary"
        >
          <Power size={24} className="text-accent-blue" />
          <div className="text-left">
            <div className="text-lg font-medium">Web Wavetable Synth</div>
            <div className="text-xs text-text-muted">Click to start audio engine</div>
          </div>
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-bg-darkest p-2">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 mb-2 bg-bg-panel rounded-lg border border-border-default">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
          <span className="text-sm font-medium tracking-wider">WEB WAVETABLE SYNTH</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Volume2 size={14} className="text-text-muted" />
            <Knob
              label=""
              value={snap.master.volume}
              min={0}
              max={1}
              onChange={(v) => (synthState.master.volume = v)}
              size={32}
              color="var(--accent-green)"
              formatValue={(v) => `${(v * 100).toFixed(0)}%`}
            />
          </div>
        </div>
      </header>

      {/* Main grid */}
      <div className="grid grid-cols-[1fr_1fr_auto_1fr] gap-2 mb-2">
        <OscillatorPanel osc="a" />
        <OscillatorPanel osc="b" />
        <SubNoisePanel />
        <FilterPanel />
      </div>

      {/* Middle row */}
      <div className="grid grid-cols-4 gap-2 mb-2">
        <EnvelopePanel />
        <LfoPanel index="lfo1" />
        <LfoPanel index="lfo2" />
        <EffectsPanel />
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-[1fr_1fr] gap-2 mb-2">
        <ModulationPanel onModRoutesChange={handleModRoutesChange} />
        <div className="flex flex-col gap-2">
          <Visualizer waveformData={waveformData} />
          {/* Macros */}
          <div className="bg-bg-panel rounded-lg border border-border-default p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] uppercase tracking-wider text-text-secondary">
                Macros
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[0, 1, 2, 3].map((i) => (
                <Knob
                  key={i}
                  label={`M${i + 1}`}
                  value={snap.macros[i]}
                  min={0}
                  max={1}
                  onChange={(v) => (synthState.macros[i] = v)}
                  size={36}
                  color="var(--accent-orange)"
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Keyboard */}
      <Keyboard onNoteOn={handleNoteOn} onNoteOff={handleNoteOff} />
    </main>
  );
}
