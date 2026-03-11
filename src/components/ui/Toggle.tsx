"use client";

interface ToggleProps {
  value: boolean;
  onChange: (value: boolean) => void;
  label?: string;
  color?: string;
}

export function Toggle({ value, onChange, label, color = "var(--accent-blue)" }: ToggleProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="flex items-center gap-1.5 cursor-pointer bg-transparent border-none p-0"
    >
      <div
        className="w-7 h-3.5 rounded-full relative transition-colors duration-150"
        style={{ background: value ? color : "var(--knob-track)" }}
      >
        <div
          className="w-3 h-3 rounded-full absolute top-[1px] transition-all duration-150"
          style={{
            background: value ? "#fff" : "var(--text-muted)",
            left: value ? "15px" : "1px",
          }}
        />
      </div>
      {label && (
        <span className="text-[10px] text-text-secondary uppercase tracking-wider">{label}</span>
      )}
    </button>
  );
}
