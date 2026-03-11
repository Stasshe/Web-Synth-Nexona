"use client";
import { useCallback, useRef, useState } from "react";

interface KeyboardProps {
  onNoteOn: (note: number, velocity: number) => void;
  onNoteOff: (note: number) => void;
}

// C2 (36) to C6 (84) = 4 octaves + 1
const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function buildKeys() {
  const keys: { note: number; label: string; black: boolean }[] = [];
  for (let note = 36; note <= 84; note++) {
    const name = NOTE_NAMES[note % 12];
    keys.push({ note, label: name, black: name.includes("#") });
  }
  return keys;
}

const ALL_KEYS = buildKeys();
const WHITE_KEYS = ALL_KEYS.filter((k) => !k.black);
const BLACK_KEYS = ALL_KEYS.filter((k) => k.black);

export function Keyboard({ onNoteOn, onNoteOff }: KeyboardProps) {
  const [activeNotes, setActiveNotes] = useState<Set<number>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  const handleDown = useCallback(
    (note: number, e: React.PointerEvent) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      // Velocity from vertical position on key (higher = louder at bottom)
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      const posY = (e.clientY - rect.top) / rect.height;
      const velocity = Math.floor(40 + posY * 87); // 40-127
      onNoteOn(note, velocity);
      setActiveNotes((s) => new Set(s).add(note));
    },
    [onNoteOn],
  );

  const handleUp = useCallback(
    (note: number) => {
      onNoteOff(note);
      setActiveNotes((s) => {
        const next = new Set(s);
        next.delete(note);
        return next;
      });
    },
    [onNoteOff],
  );

  const totalWhite = WHITE_KEYS.length;

  return (
    <div
      ref={containerRef}
      className="relative h-[72px] flex select-none shrink-0"
      style={{ touchAction: "none" }}
    >
      {WHITE_KEYS.map((key) => (
        <div
          key={key.note}
          onPointerDown={(e) => handleDown(key.note, e)}
          onPointerUp={() => handleUp(key.note)}
          onPointerLeave={() => handleUp(key.note)}
          className="flex-1 flex items-end justify-center pb-1 text-[9px] cursor-pointer rounded-b border border-border-default transition-colors"
          style={{
            backgroundColor: activeNotes.has(key.note) ? "var(--accent-blue)" : "#d8d8e0",
            color: activeNotes.has(key.note) ? "#fff" : "#666",
            userSelect: "none",
            touchAction: "none",
          }}
        >
          {key.note % 12 === 0 ? `C${Math.floor(key.note / 12) - 1}` : ""}
        </div>
      ))}
      {BLACK_KEYS.map((key) => {
        const whiteIndex = WHITE_KEYS.findIndex((w) => w.note > key.note) - 1;
        const leftPercent = ((whiteIndex + 0.65) / totalWhite) * 100;

        return (
          <div
            key={key.note}
            onPointerDown={(e) => handleDown(key.note, e)}
            onPointerUp={() => handleUp(key.note)}
            onPointerLeave={() => handleUp(key.note)}
            className="absolute rounded-b cursor-pointer z-10 transition-colors"
            style={{
              left: `${leftPercent}%`,
              width: `${(0.55 / totalWhite) * 100}%`,
              height: "60%",
              backgroundColor: activeNotes.has(key.note) ? "var(--accent-blue)" : "#222",
              border: "1px solid #111",
              userSelect: "none",
              touchAction: "none",
            }}
          />
        );
      })}
    </div>
  );
}
