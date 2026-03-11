"use client";
import { useCallback, useEffect, useRef, useState } from "react";

interface KeyboardProps {
  onNoteOn: (note: number, velocity: number) => void;
  onNoteOff: (note: number) => void;
}

// C2 (36) to C6 (84) = 4 octaves + 1
const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

// QWERTY keyboard → MIDI note mapping (two rows, starting at C3=48)
// Lower row: Z S X D C V G B H N J M  → C3..B3
// Upper row: Q 2 W 3 E R 5 T 6 Y 7 U I 9 O 0 P → C4..E5
const QWERTY_MAP: Record<string, number> = {
  // Lower row — C3 (48) to B3 (59)
  KeyZ: 48, KeyS: 49, KeyX: 50, KeyD: 51, KeyC: 52,
  KeyV: 53, KeyG: 54, KeyB: 55, KeyH: 56, KeyN: 57,
  KeyJ: 58, KeyM: 59,
  // Upper row — C4 (60) to E5 (76)
  KeyQ: 60, Digit2: 61, KeyW: 62, Digit3: 63, KeyE: 64,
  KeyR: 65, Digit5: 66, KeyT: 67, Digit6: 68, KeyY: 69,
  Digit7: 70, KeyU: 71, KeyI: 72, Digit9: 73, KeyO: 74,
  Digit0: 75, KeyP: 76,
};
const DEFAULT_VELOCITY = 100;

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

  // QWERTY keyboard support
  const qwertyHeld = useRef<Set<string>>(new Set());

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      // Ignore when typing in inputs / textareas / contentEditable
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement).isContentEditable) return;

      const note = QWERTY_MAP[e.code];
      if (note === undefined) return;
      if (qwertyHeld.current.has(e.code)) return;
      qwertyHeld.current.add(e.code);
      e.preventDefault();
      onNoteOn(note, DEFAULT_VELOCITY);
      setActiveNotes((s) => new Set(s).add(note));
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const note = QWERTY_MAP[e.code];
      if (note === undefined) return;
      if (!qwertyHeld.current.has(e.code)) return;
      qwertyHeld.current.delete(e.code);
      e.preventDefault();
      onNoteOff(note);
      setActiveNotes((s) => {
        const next = new Set(s);
        next.delete(note);
        return next;
      });
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [onNoteOn, onNoteOff]);

  const totalWhite = WHITE_KEYS.length;

  return (
    <div
      ref={containerRef}
      className="relative h-[80px] bg-bg-panel rounded-lg border border-border-default flex select-none shrink-0 overflow-hidden mx-1.5 mb-1.5"
      style={{ touchAction: "none" }}
    >
      {WHITE_KEYS.map((key) => (
        <div
          key={key.note}
          onPointerDown={(e) => handleDown(key.note, e)}
          onPointerUp={() => handleUp(key.note)}
          onPointerLeave={() => handleUp(key.note)}
          className="flex-1 flex items-end justify-center pb-1 text-[9px] cursor-pointer border-r border-border-default last:border-r-0 transition-colors"
          style={{
            backgroundColor: activeNotes.has(key.note) ? "var(--accent-blue)" : "#eee",
            color: activeNotes.has(key.note) ? "#fff" : "#999",
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
            className="absolute cursor-pointer z-10 transition-colors rounded-b-sm shadow-md"
            style={{
              left: `${leftPercent}%`,
              width: `${(0.6 / totalWhite) * 100}%`,
              height: "60%",
              backgroundColor: activeNotes.has(key.note) ? "var(--accent-blue)" : "#1a1a1a",
              border: "1px solid #000",
              userSelect: "none",
              touchAction: "none",
            }}
          />
        );
      })}
    </div>
  );
}
