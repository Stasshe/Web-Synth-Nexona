"use client";

import type { ModRoute } from "@/audio/dsp/modulation/modMatrix";
import type { Wavetable } from "@/audio/dsp/wavetable/wavetablePresets";
import { AudioRecorder, type RecordingResult } from "@/audio/export/audioRecorder";
import { type ExportFormat, exportAudio } from "@/audio/export/exportAudio";
import { type SynthNode, createSynthNode } from "@/audio/worklet/node";
import { DndProvider } from "@/components/DndProvider";
import { EffectsPage } from "@/components/EffectsPage";
import { Keyboard } from "@/components/Keyboard";
import { MacroStrip } from "@/components/MacroPanel";
import { ModulatorSidebar } from "@/components/ModulatorSidebar";
import { ParamEditor } from "@/components/ParamEditor";
import { Visualizer } from "@/components/Visualizer";
import { VoicePage } from "@/components/VoicePage";
import { WaveformEditor } from "@/components/WaveformEditor";
import { Knob } from "@/components/ui/Knob";
import { useGlobalScrollLock } from "@/hooks/scrollLock";
import { loadPatchIntoState, urlToPatch } from "@/patch/loader";
import { patchToUrl, stateToPatch } from "@/patch/serializer";
import { updateModFeedback } from "@/state/modFeedback";
import { bindStateToSAB, synthState, restoreStateFromSavedData, setupAutoSave } from "@/state/synthState";
import { initIndexedDB, loadState } from "@/storage/indexeddb";
import { Circle, Code, Download, Power, Share2, Square, Upload, Volume2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { subscribe } from "valtio";
import { useSnapshot } from "valtio";

export default function Home() {
  const [started, setStarted] = useState(false);
  const synthRef = useRef<SynthNode | null>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const [waveformData, setWaveformData] = useState<Float32Array | null>(null);
  const [paramEditorOpen, setParamEditorOpen] = useState(false);
  const [waveEditorOsc, setWaveEditorOsc] = useState<"a" | "b" | "c" | null>(null);
  const [recState, setRecState] = useState<"idle" | "recording" | "done">("idle");
  const [recElapsed, setRecElapsed] = useState(0);
  const [recResult, setRecResult] = useState<RecordingResult | null>(null);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("wav");
  const [exporting, setExporting] = useState(false);
  const recTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const snap = useSnapshot(synthState);
  useGlobalScrollLock();

  // Initialize IndexedDB and load saved state
  useEffect(() => {
    const init = async () => {
      try {
        await initIndexedDB();
        const savedState = await loadState();
        if (savedState) {
          restoreStateFromSavedData(savedState);
        }
      } catch (e) {
        console.error("Failed to load state from IndexedDB:", e);
      }
    };
    init();
  }, []);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      urlToPatch(hash).then((patch) => {
        if (patch) loadPatchIntoState(patch);
      });
    }
  }, []);

  useEffect(() => {
    const unsubs: (() => void)[] = [];

    // Subscribe to modulations
    unsubs.push(
      subscribe(synthState.modulations, () => {
        if (synthRef.current) {
          const plain = synthState.modulations.map((r) => ({
            source: r.source,
            target: r.target,
            amount: r.amount,
          }));
          synthRef.current.setModRoutes(plain as ModRoute[]);
        }
      })
    );

    // Setup auto-save
    unsubs.push(setupAutoSave());

    return () => {
      for (const unsub of unsubs) unsub();
    };
  }, []);

  const applyCustomWavetables = useCallback((synth: SynthNode) => {
    for (const oscKey of ["a", "b", "c"] as const) {
      const oscState = synthState.oscillators[oscKey];
      if (oscState.customWaveform && oscState.customWaveform.length > 0) {
        const table = new Float32Array(oscState.customWaveform);
        const wt: Wavetable = { frames: [table], tableSize: table.length - 1, numFrames: 1 };
        if (oscKey === "a") synth.loadWavetableA(wt);
        else if (oscKey === "b") synth.loadWavetableB(wt);
        else synth.loadWavetableC(wt);
      }
    }
    const subState = synthState.oscillators.sub;
    if (subState.customWaveform && subState.customWaveform.length > 0) {
      const table = new Float32Array(subState.customWaveform);
      const wt: Wavetable = { frames: [table], tableSize: table.length - 1, numFrames: 1 };
      synth.loadWavetableSub(wt);
    }
  }, []);

  const handleStart = useCallback(async () => {
    if (started) return;
    const ctx = new AudioContext({ sampleRate: 48000 });
    ctxRef.current = ctx;
    const synth = await createSynthNode(ctx);
    synthRef.current = synth;

    // Set up recorder in the audio graph: synth → recorder → destination
    const recorder = new AudioRecorder(ctx);
    await recorder.init();
    recorderRef.current = recorder;
    synth.node.connect(recorder.getNode());
    recorder.getNode().connect(ctx.destination);

    bindStateToSAB(synth.sabView);
    synth.onWaveformData(setWaveformData);
    synth.onModFeedback(updateModFeedback);
    applyCustomWavetables(synth);
    setStarted(true);
  }, [started, applyCustomWavetables]);

  const handleNoteOn = useCallback((note: number, velocity: number) => {
    synthRef.current?.noteOn(note, velocity);
  }, []);

  const handleNoteOff = useCallback((note: number) => {
    synthRef.current?.noteOff(note);
  }, []);

  const handleShare = useCallback(async () => {
    const patch = stateToPatch("Shared Patch");
    const encoded = await patchToUrl(patch);
    const url = `${window.location.origin}${window.location.pathname}#${encoded}`;
    await navigator.clipboard.writeText(url);
    window.location.hash = encoded;
  }, []);

  const handleRecStart = useCallback(() => {
    if (!recorderRef.current) return;
    recorderRef.current.start();
    setRecState("recording");
    setRecElapsed(0);
    const start = Date.now();
    recTimerRef.current = setInterval(() => {
      setRecElapsed(Math.floor((Date.now() - start) / 1000));
    }, 200);
  }, []);

  const handleRecStop = useCallback(async () => {
    if (!recorderRef.current) return;
    if (recTimerRef.current) {
      clearInterval(recTimerRef.current);
      recTimerRef.current = null;
    }
    const result = await recorderRef.current.stop();
    setRecResult(result);
    setRecState("done");
  }, []);

  const handleExport = useCallback(async () => {
    if (!recResult) return;
    setExporting(true);
    await exportAudio(recResult, exportFormat);
    setExporting(false);
  }, [recResult, exportFormat]);

  const handleRecDiscard = useCallback(() => {
    setRecResult(null);
    setRecState("idle");
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
          applyCustomWavetables(synthRef.current);
        }
      } catch {
        // ignore invalid files
      }
    };
    input.click();
  }, [applyCustomWavetables]);

  if (!started) {
    return (
      <main className="flex items-center justify-center min-h-[100dvh]">
        <button
          type="button"
          onClick={handleStart}
          className="flex items-center gap-3 px-8 py-4 bg-bg-surface border border-border-default rounded-xl
                     hover:border-accent-blue hover:bg-bg-hover transition-all cursor-pointer text-text-primary"
        >
          <Power size={24} className="text-accent-blue" />
          <div className="text-left">
            <div className="text-lg font-medium">Web Synth - Nexona</div>
            <div className="text-xs text-text-muted">Click to start audio engine</div>
          </div>
        </button>
      </main>
    );
  }

  const activePage = snap.ui.activePage;

  return (
    <DndProvider>
      <main className="h-[100dvh] bg-bg-darkest p-1.5 flex flex-col overflow-hidden gap-1">
        {/* Header */}
        <header className="flex items-center justify-between px-3 py-1 bg-bg-panel rounded-lg border border-border-default shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
              <span className="text-xs font-medium tracking-wider">Nexona</span>
            </div>
            <Visualizer waveformData={waveformData} />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleSave}
                className="flex items-center gap-1 px-2 py-0.5 text-[10px] text-text-muted hover:text-text-primary bg-bg-surface border border-border-default rounded transition-colors cursor-pointer"
                title="Save patch to file"
              >
                <Download size={11} /> Save
              </button>
              <button
                type="button"
                onClick={handleLoad}
                className="flex items-center gap-1 px-2 py-0.5 text-[10px] text-text-muted hover:text-text-primary bg-bg-surface border border-border-default rounded transition-colors cursor-pointer"
                title="Load patch from file"
              >
                <Upload size={11} /> Load
              </button>
              <button
                type="button"
                onClick={handleShare}
                className="flex items-center gap-1 px-2 py-0.5 text-[10px] text-text-muted hover:text-accent-blue bg-bg-surface border border-border-default rounded transition-colors cursor-pointer"
                title="Copy share URL to clipboard"
              >
                <Share2 size={11} /> Share
              </button>
              <button
                type="button"
                onClick={() => setParamEditorOpen(true)}
                className="flex items-center gap-1 px-2 py-0.5 text-[10px] text-text-muted hover:text-accent-purple bg-bg-surface border border-border-default rounded transition-colors cursor-pointer"
                title="Edit all parameters as JSON"
              >
                <Code size={11} /> Edit
              </button>
            </div>
            {/* Recording controls */}
            <div className="flex items-center gap-1">
              {recState === "idle" && (
                <button
                  type="button"
                  onClick={handleRecStart}
                  className="flex items-center gap-1 px-2 py-0.5 text-[10px] text-text-muted hover:text-red-400 bg-bg-surface border border-border-default rounded transition-colors cursor-pointer"
                  title="Start recording"
                >
                  <Circle size={9} fill="currentColor" /> Rec
                </button>
              )}
              {recState === "recording" && (
                <button
                  type="button"
                  onClick={handleRecStop}
                  className="flex items-center gap-1 px-2 py-0.5 text-[10px] text-red-400 bg-bg-surface border border-red-500/50 rounded transition-colors cursor-pointer animate-pulse"
                  title="Stop recording"
                >
                  <Square size={9} fill="currentColor" /> {Math.floor(recElapsed / 60)}:
                  {(recElapsed % 60).toString().padStart(2, "0")}
                </button>
              )}
              {recState === "done" && (
                <>
                  <select
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value as ExportFormat)}
                    className="px-1 py-0.5 text-[10px] bg-bg-surface border border-border-default rounded text-text-primary cursor-pointer"
                  >
                    <option value="wav">WAV</option>
                    <option value="mp3">MP3</option>
                    <option value="m4a">M4A</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleExport}
                    disabled={exporting}
                    className="flex items-center gap-1 px-2 py-0.5 text-[10px] text-accent-green hover:text-text-primary bg-bg-surface border border-border-default rounded transition-colors cursor-pointer disabled:opacity-50"
                    title="Export recording"
                  >
                    <Download size={11} /> {exporting ? "..." : "Export"}
                  </button>
                  <button
                    type="button"
                    onClick={handleRecDiscard}
                    className="flex items-center px-1 py-0.5 text-[10px] text-text-muted hover:text-red-400 bg-bg-surface border border-border-default rounded transition-colors cursor-pointer"
                    title="Discard recording"
                  >
                    <X size={11} />
                  </button>
                </>
              )}
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

        {/* Body — flex-1 takes all remaining height */}
        <div className="flex-1 flex flex-row gap-1 min-h-0 overflow-hidden">
          {/* Left macro strip */}
          <MacroStrip />

          {/* Center: Voice / Effects */}
          <div className="flex-1 flex flex-col gap-1 min-h-0">
            {/* Tab bar */}
            <div className="flex gap-1 bg-bg-panel rounded-lg border border-border-default px-2 py-1 shrink-0">
              {(["voice", "effects"] as const).map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => (synthState.ui.activePage = page)}
                  className={`px-5 py-0.5 text-[11px] font-semibold tracking-widest rounded transition-colors uppercase cursor-pointer border ${
                    activePage === page
                      ? "bg-bg-active border-border-accent text-text-primary"
                      : "border-transparent text-text-muted hover:text-text-secondary"
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>

            {/* Page content */}
            <div className="flex-1 min-h-0">
              {activePage === "voice" ? (
                <VoicePage onOpenWaveEditor={setWaveEditorOsc} />
              ) : (
                <div className="overflow-y-auto h-full">
                  <EffectsPage />
                </div>
              )}
            </div>
          </div>

          {/* Right sidebar: Envelope + LFOs + Mod routes */}
          <ModulatorSidebar />
        </div>

        {/* Keyboard — fixed at bottom */}
        <Keyboard onNoteOn={handleNoteOn} onNoteOff={handleNoteOff} />

        {/* Modals */}
        <ParamEditor open={paramEditorOpen} onClose={() => setParamEditorOpen(false)} />

        {waveEditorOsc && (
          <WaveformEditor
            open={true}
            onClose={() => setWaveEditorOsc(null)}
            osc={waveEditorOsc}
            onApply={(wt) => {
              if (waveEditorOsc === "a") synthRef.current?.loadWavetableA(wt);
              else if (waveEditorOsc === "b") synthRef.current?.loadWavetableB(wt);
              else if (waveEditorOsc === "c") synthRef.current?.loadWavetableC(wt);
            }}
          />
        )}
      </main>
    </DndProvider>
  );
}
