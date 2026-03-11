"use client";

import { loadPatchIntoState } from "@/patch/loader";
import { stateToPatch } from "@/patch/serializer";
import { useCallback, useEffect, useRef, useState } from "react";

interface ParamEditorProps {
  open: boolean;
  onClose: () => void;
}

function stateToAnnotatedJson(): string {
  const patch = stateToPatch("Current");

  // Build annotated JSONC with min/max comments
  const lines: string[] = ["{"];

  const ranges: Record<string, [number, number]> = {
    level: [0, 1],
    framePosition: [0, 1],
    detune: [-100, 100],
    unisonVoices: [1, 16],
    unisonDetune: [0, 100],
    unisonSpread: [0, 1],
    pan: [-1, 1],
    warpType: [0, 6],
    warpAmount: [0, 1],
    warp2Type: [0, 6],
    warp2Amount: [0, 1],
    octave: [-2, 0],
    shape: [0, 1],
    cutoff: [20, 20000],
    resonance: [0, 0.99],
    drive: [1, 10],
    type: [0, 3],
    envAmount: [-1, 1],
    attack: [0.001, 5],
    decay: [0.001, 5],
    sustain: [0, 1],
    release: [0.001, 10],
    rate: [0.01, 20],
    depth: [0, 1],
    mix: [0, 1],
    time: [0.01, 2],
    feedback: [0, 0.95],
    volume: [0, 1],
    amount: [-1, 1],
  };

  const warpNames = ["NONE", "BEND", "SYNC", "PHASE_DIST", "MIRROR", "QUANTIZE", "FM"];
  const filterNames = ["LOWPASS", "HIGHPASS", "BANDPASS", "NOTCH"];
  const noiseNames = ["WHITE", "PINK", "BROWN"];
  const lfoShapeNames = ["SINE", "TRIANGLE", "SQUARE", "RANDOM"];
  const subShapeNames = ["SINE", "SQUARE"];

  function getComment(key: string, value: unknown): string {
    const r = ranges[key];
    let comment = "";
    if (r) comment = ` // ${r[0]}..${r[1]}`;

    if (typeof value === "number") {
      if (key === "warpType" || key === "warp2Type") comment += ` (${warpNames[value] ?? value})`;
      if (key === "type" && value <= 3) comment += ` (${filterNames[value] ?? value})`;
      if (key === "shape" && value <= 1) comment += ` (${subShapeNames[value] ?? value})`;
    }
    return comment;
  }

  function getCommentForNested(parentKey: string, key: string, value: unknown): string {
    if (parentKey === "noise" && key === "type")
      return ` // 0..2 (${noiseNames[value as number] ?? value})`;
    if ((parentKey === "lfo1" || parentKey === "lfo2") && key === "shape")
      return ` // 0..3 (${lfoShapeNames[value as number] ?? value})`;
    return getComment(key, value);
  }

  function addObject(obj: Record<string, unknown>, indent: number, parentKey = ""): void {
    const keys = Object.keys(obj);
    for (let ki = 0; ki < keys.length; ki++) {
      const key = keys[ki];
      const val = obj[key];
      const comma = ki < keys.length - 1 ? "," : "";
      const pad = "  ".repeat(indent);

      if (val !== null && typeof val === "object" && !Array.isArray(val)) {
        lines.push(`${pad}"${key}": {`);
        addObject(val as Record<string, unknown>, indent + 1, key);
        lines.push(`${pad}}${comma}`);
      } else if (Array.isArray(val)) {
        if (key === "modulations") {
          if (val.length === 0) {
            lines.push(`${pad}"${key}": []${comma} // [{source, target, amount}]`);
          } else {
            lines.push(`${pad}"${key}": [`);
            for (let mi = 0; mi < val.length; mi++) {
              const m = val[mi];
              const mc = mi < val.length - 1 ? "," : "";
              lines.push(
                `${pad}  { "source": ${m.source}, "target": ${m.target}, "amount": ${m.amount} }${mc}`,
              );
            }
            lines.push(`${pad}]${comma}`);
          }
        } else {
          lines.push(`${pad}"${key}": ${JSON.stringify(val)}${comma}`);
        }
      } else {
        const comment = getCommentForNested(parentKey, key, val);
        lines.push(`${pad}"${key}": ${JSON.stringify(val)}${comma}${comment}`);
      }
    }
  }

  addObject(patch as unknown as Record<string, unknown>, 1);
  lines.push("}");
  return lines.join("\n");
}

function stripComments(text: string): string {
  return text.replace(/\/\/.*$/gm, "");
}

export function ParamEditor({ open, onClose }: ParamEditorProps) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setText(stateToAnnotatedJson());
      setError(null);
    }
  }, [open]);

  const handleApply = useCallback(() => {
    try {
      const cleaned = stripComments(text);
      const parsed = JSON.parse(cleaned);
      loadPatchIntoState(parsed);
      setError(null);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid JSON");
    }
  }, [text, onClose]);

  const handleReset = useCallback(() => {
    setText(stateToAnnotatedJson());
    setError(null);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-[700px] max-h-[85vh] bg-bg-panel border border-border-default rounded-lg flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border-default">
          <span className="text-sm font-medium tracking-wider text-text-primary">
            PARAMETER EDITOR
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="px-3 py-1 text-[11px] text-text-muted hover:text-text-primary
                         bg-bg-surface border border-border-default rounded cursor-pointer transition-colors"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-3 py-1 text-[11px] text-bg-darkest
                         bg-accent-blue rounded cursor-pointer hover:brightness-110 transition-all"
            >
              Apply
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-2 py-1 text-[11px] text-text-muted hover:text-text-primary cursor-pointer"
            >
              X
            </button>
          </div>
        </div>

        {/* Error bar */}
        {error && (
          <div className="px-4 py-1 text-[11px] text-accent-red bg-accent-red/10 border-b border-accent-red/30">
            {error}
          </div>
        )}

        {/* Editor */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          spellCheck={false}
          className="flex-1 p-4 bg-bg-darkest text-text-primary text-[12px] leading-[1.5]
                     font-mono resize-none border-none outline-none overflow-auto min-h-[400px]"
        />

        {/* Footer hint */}
        <div className="px-4 py-1.5 text-[10px] text-text-muted border-t border-border-default">
          JSONC format (comments allowed). Edit values and click Apply to update synth state.
          Comments show min..max ranges.
        </div>
      </div>
    </div>
  );
}
