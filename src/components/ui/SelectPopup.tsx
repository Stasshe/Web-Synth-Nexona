"use client";
import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface SelectPopupProps {
  value: string | number;
  options: { value: string | number; label: string }[];
  onChange: (value: string) => void;
  /** Override label shown in button (for custom/special states) */
  displayLabel?: string;
  /** Accent color for selected item highlight in popup */
  accentColor?: string;
  /** Reduce vertical padding to match arrow buttons */
  compact?: boolean;
  className?: string;
}

export function SelectPopup({
  value,
  options,
  onChange,
  displayLabel,
  accentColor,
  compact = false,
  className = "",
}: SelectPopupProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const currentLabel =
    displayLabel ?? options.find((o) => String(o.value) === String(value))?.label ?? String(value);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (open) {
      // small delay to ensure element is rendered
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setQuery("");
    }
  }, [open]);

  const filteredOptions = options.filter((o) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return o.label.toLowerCase().includes(q) || String(o.value).toLowerCase().includes(q);
  });

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center justify-between gap-1 px-2 text-xs text-text-secondary hover:text-text-primary bg-bg-surface border border-border-default rounded cursor-pointer transition-colors ${
          compact ? "py-0.5" : "py-1"
        }`}
      >
        <span className="truncate">{currentLabel}</span>
        <ChevronDown
          size={10}
          className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 left-0 right-0 bg-bg-darkest border border-border-default rounded shadow-xl overflow-hidden max-h-48">
          <div className="px-2 pt-2 pb-1">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search..."
              className="w-full text-xs px-2 py-1 rounded bg-bg-surface border border-border-default text-text-secondary focus:outline-none focus:border-border-primary"
            />
          </div>
          <div className="overflow-y-auto max-h-40">
            {filteredOptions.length === 0 ? (
              <div className="px-2 py-2 text-[10px] text-text-secondary">No results</div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = String(opt.value) === String(value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(String(opt.value));
                      setOpen(false);
                    }}
                    className={`w-full text-left px-2 py-1.5 text-[10px] cursor-pointer transition-colors border-l-2 ${
                      isSelected
                        ? "text-text-primary bg-bg-active border-l-accent-blue"
                        : "text-text-secondary hover:text-text-primary hover:bg-bg-hover border-l-transparent"
                    }`}
                    style={
                      isSelected && accentColor
                        ? {
                            borderLeftColor: accentColor,
                            backgroundColor: `color-mix(in srgb, ${accentColor} 20%, var(--bg-darkest))`,
                          }
                        : {}
                    }
                  >
                    {opt.label}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
