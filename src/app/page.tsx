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
import { ParamEditor } from "@/components/ParamEditor";
import { SubNoisePanel } from "@/components/SubNoisePanel";
import { Visualizer } from "@/components/Visualizer";
import { Knob } from "@/components/ui/Knob";
import { loadPatchIntoState, urlToPatch } from "@/patch/loader";
import { patchToUrl, stateToPatch } from "@/patch/serializer";
import { bindStateToSAB, synthState } from "@/state/synthState";
import { Code, Download, Power, Share2, Upload, Volume2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSnapshot } from "valtio";

export default function Home() {
  const [started, setStarted] = useState(false);
  const synthRef = useRef<SynthNode | null>(null);
  const unbindRef = useRef<(() => void) | null>(null);
  const [waveformData, setWaveformData] = useState<Float32Array | null>(null);
  const [paramEditorOpen, setParamEditorOpen] = useState(false);
  const snap = useSnapshot(synthState);

  // Load patch from URL hash on mount
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      urlToPatch(hash).then((patch) => {
        if (patch) loadPatchIntoState(patch);
      });
    }
  }, []);

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

  const handleShare = useCallback(async () => {
    const patch = stateToPatch("Shared Patch");
    const encoded = await patchToUrl(patch);
    const url = `${window.location.origin}${window.location.pathname}#${encoded}`;
    await navigator.clipboard.writeText(url);
    window.location.hash = encoded;
  }, []);

  const handleSave = useCallback(() => {
    const patch = stateToPatch("My Patch");
    const json = JSON.stringify(patch, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "patch.json";
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleLoad = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const text = await file.text();
      try {
        const patch = JSON.parse(text);
        loadPatchIntoState(patch);
        if (synthRef.current) {
          synthRef.current.setModRoutes(synthState.modulations as ModRoute[]);
        }
      } catch {
        // ignore invalid files
      }
    };
    input.click();
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
    <main className="h-screen bg-bg-darkest p-1.5 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-3 py-1 mb-1 bg-bg-panel rounded-lg border border-border-default shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
          <span className="text-xs font-medium tracking-wider">WEB WAVETABLE SYNTH</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1 px-2 py-0.5 text-[10px] text-text-muted hover:text-text-primary
                         bg-bg-surface border border-border-default rounded transition-colors cursor-pointer"
              title="Save patch to file"
            >
              <Download size={11} />
              Save
            </button>
            <button
              type="button"
              onClick={handleLoad}
              className="flex items-center gap-1 px-2 py-0.5 text-[10px] text-text-muted hover:text-text-primary
                         bg-bg-surface border border-border-default rounded transition-colors cursor-pointer"
              title="Load patch from file"
            >
              <Upload size={11} />
              Load
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="flex items-center gap-1 px-2 py-0.5 text-[10px] text-text-muted hover:text-accent-blue
                         bg-bg-surface border border-border-default rounded transition-colors cursor-pointer"
              title="Copy share URL to clipboard"
            >
              <Share2 size={11} />
              Share
            </button>
            <button
              type="button"
              onClick={() => setParamEditorOpen(true)}
              className="flex items-center gap-1 px-2 py-0.5 text-[10px] text-text-muted hover:text-accent-purple
                         bg-bg-surface border border-border-default rounded transition-colors cursor-pointer"
              title="Edit all parameters as JSON"
            >
              <Code size={11} />
              Edit
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            <Volume2 size={13} className="text-text-muted" />
            <Knob
              label=""
              value={snap.master.volume}
              min={0}
              max={1}
              onChange={(v) => (synthState.master.volume = v)}
              size={28}
              color="var(--accent-green)"
              formatValue={(v) => `${(v * 100).toFixed(0)}%`}
            />
          </div>
        </div>
      </header>

      {/* Main content — fills remaining space */}
      <div className="flex-1 flex flex-col gap-1 min-h-0">
        {/* Row 1: Oscillators + Filter */}
        <div className="grid grid-cols-[1fr_1fr_auto_1fr] gap-1 min-h-0">
          <OscillatorPanel osc="a" />
          <OscillatorPanel osc="b" />
          <SubNoisePanel />
          <FilterPanel />
        </div>

        {/* Row 2: Envelope + LFOs + Effects + Mod/Scope */}
        <div className="grid grid-cols-5 gap-1 min-h-0">
          <EnvelopePanel />
          <LfoPanel index="lfo1" />
          <LfoPanel index="lfo2" />
          <EffectsPanel />
          <div className="flex flex-col gap-1">
            <ModulationPanel onModRoutesChange={handleModRoutesChange} />
            <Visualizer waveformData={waveformData} />
          </div>
        </div>

        {/* Row 3: Macros */}
        <div className="bg-bg-panel rounded border border-border-default px-3 py-1 shrink-0">
          <div className="flex items-center gap-4">
            <span className="text-[9px] uppercase tracking-wider text-text-secondary">Macros</span>
            <div className="flex gap-3">
              {[0, 1, 2, 3].map((i) => (
                <Knob
                  key={i}
                  label={`M${i + 1}`}
                  value={snap.macros[i]}
                  min={0}
                  max={1}
                  onChange={(v) => (synthState.macros[i] = v)}
                  size={28}
                  color="var(--accent-orange)"
                />
              ))}
            </div>
          </div>
        </div>

        {/* Keyboard */}
        <Keyboard onNoteOn={handleNoteOn} onNoteOff={handleNoteOff} />
      </div>

      {/* Param Editor Modal */}
      <ParamEditor open={paramEditorOpen} onClose={() => setParamEditorOpen(false)} />
    </main>
  );
}
