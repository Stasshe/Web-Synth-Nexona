"use client";

import { useCallback } from "react";

interface KeyboardProps {
  onNoteOn: (note: number) => void;
  onNoteOff: (note: number) => void;
}

const KEYS = [
  { note: 60, label: "C", black: false },
  { note: 61, label: "C#", black: true },
  { note: 62, label: "D", black: false },
  { note: 63, label: "D#", black: true },
  { note: 64, label: "E", black: false },
  { note: 65, label: "F", black: false },
  { note: 66, label: "F#", black: true },
  { note: 67, label: "G", black: false },
  { note: 68, label: "G#", black: true },
  { note: 69, label: "A", black: false },
  { note: 70, label: "A#", black: true },
  { note: 71, label: "B", black: false },
  { note: 72, label: "C", black: false },
];

export function Keyboard({ onNoteOn, onNoteOff }: KeyboardProps) {
  const handlePointerDown = useCallback(
    (note: number) => (e: React.PointerEvent) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      onNoteOn(note);
    },
    [onNoteOn],
  );

  const handlePointerUp = useCallback(
    (note: number) => (e: React.PointerEvent) => {
      e.preventDefault();
      onNoteOff(note);
    },
    [onNoteOff],
  );

  return (
    <div 
      style={{ 
        position: "relative", 
        height: 140, 
        display: "flex",
        userSelect: "none",
      }}>
      {KEYS.filter((k) => !k.black).map((key) => (
        <div
          key={key.note}
          onPointerDown={handlePointerDown(key.note)}
          onPointerUp={handlePointerUp(key.note)}
          onPointerLeave={handlePointerUp(key.note)}
          style={{
            flex: 1,
            backgroundColor: "#e8e8e8",
            border: "1px solid #999",
            borderRadius: "0 0 4px 4px",
            cursor: "pointer",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            paddingBottom: 8,
            fontSize: 11,
            color: "#666",
            userSelect: "none",
            touchAction: "none",
          }}
        >
          {key.label}
        </div>
      ))}
      {KEYS.filter((k) => k.black).map((key) => {
        const whiteKeys = KEYS.filter((k) => !k.black);
        const whiteIndex = whiteKeys.findIndex((w) => w.note > key.note) - 1;
        const totalWhite = whiteKeys.length;
        const leftPercent = ((whiteIndex + 0.65) / totalWhite) * 100;

        return (
          <div
            key={key.note}
            onPointerDown={handlePointerDown(key.note)}
            onPointerUp={handlePointerUp(key.note)}
            onPointerLeave={handlePointerUp(key.note)}
            style={{
              position: "absolute",
              left: `${leftPercent}%`,
              width: `${(0.6 / totalWhite) * 100}%`,
              height: "60%",
              backgroundColor: "#333",
              border: "1px solid #111",
              borderRadius: "0 0 3px 3px",
              cursor: "pointer",
              zIndex: 1,
              userSelect: "none",
              touchAction: "none",
            }}
          />
        );
      })}
    </div>
  );
}
