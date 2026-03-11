"use client";

import { useCallback, useRef, useState } from "react";
import { createSynthNode, type SynthNode } from "../audio/worklet/node";
import { bindStateToSAB } from "../state/synthState";
import { OscillatorPanel } from "../components/OscillatorPanel";
import { FilterPanel } from "../components/FilterPanel";
import { EnvelopePanel } from "../components/EnvelopePanel";
import { Keyboard } from "../components/Keyboard";
import { Power } from "lucide-react";

export default function Home() {
  const [started, setStarted] = useState(false);
  const synthRef = useRef<SynthNode | null>(null);
  const unbindRef = useRef<(() => void) | null>(null);

  const handleStart = useCallback(async () => {
    if (started) return;
    const ctx = new AudioContext({ sampleRate: 48000 });
    const synth = await createSynthNode(ctx);
    synthRef.current = synth;
    unbindRef.current = bindStateToSAB(synth.sabView);
    setStarted(true);
  }, [started]);

  const handleNoteOn = useCallback((note: number) => {
    synthRef.current?.noteOn(note, 127);
  }, []);

  const handleNoteOff = useCallback((note: number) => {
    synthRef.current?.noteOff(note);
  }, []);

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: 24 }}>
      <header style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, margin: 0 }}>Web Synth</h1>
        <button
          type="button"
          onClick={handleStart}
          disabled={started}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 16px",
            backgroundColor: started ? "#2d5a27" : "#4a4a6a",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            cursor: started ? "default" : "pointer",
            fontSize: 14,
          }}
        >
          <Power size={16} />
          {started ? "Running" : "Start Audio"}
        </button>
      </header>

      {started && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
            <OscillatorPanel />
            <FilterPanel />
            <EnvelopePanel />
          </div>
          <Keyboard onNoteOn={handleNoteOn} onNoteOff={handleNoteOff} />
        </>
      )}
    </main>
  );
}
