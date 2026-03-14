"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SelectPopup } from "@/components/ui/SelectPopup";

interface SelectWithArrowsProps {
  value: string | number;
  options: { value: string | number; label: string }[];
  onChange: (value: string) => void;
  /** Override label shown in button (for custom/special states) */
  displayLabel?: string;
  /** Accent color for selected item highlight in popup */
  accentColor?: string;
  className?: string;
}

export function SelectWithArrows({
  value,
  options,
  onChange,
  displayLabel,
  accentColor,
  className = "",
}: SelectWithArrowsProps) {
  const currentIndex = options.findIndex((o) => String(o.value) === String(value));

  function cyclePrev() {
    if (!options.length) return;
    const prev = currentIndex <= 0 ? options.length - 1 : currentIndex - 1;
    onChange(String(options[prev].value));
  }

  function cycleNext() {
    if (!options.length) return;
    const next = currentIndex >= options.length - 1 ? 0 : currentIndex + 1;
    onChange(String(options[next].value));
  }

  const btnArrow =
    "flex items-center justify-center shrink-0 px-1 py-1 text-text-secondary hover:text-text-primary bg-bg-surface border border-border-default rounded cursor-pointer transition-colors";

  return (
    <div className={`flex items-center gap-0.5 ${className}`}>
      <button type="button" onClick={cyclePrev} className={btnArrow} title="Previous">
        <ChevronLeft size={9} />
      </button>
      <SelectPopup
        value={value}
        options={options}
        onChange={onChange}
        displayLabel={displayLabel}
        accentColor={accentColor}
        className="flex-1"
      />
      <button type="button" onClick={cycleNext} className={btnArrow} title="Next">
        <ChevronRight size={9} />
      </button>
    </div>
  );
}
