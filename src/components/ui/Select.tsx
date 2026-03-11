"use client";

interface SelectProps {
  value: string | number;
  options: { value: string | number; label: string }[];
  onChange: (value: string) => void;
  className?: string;
}

export function Select({ value, options, onChange, className = "" }: SelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`bg-bg-surface border border-border-default rounded px-2 py-1 text-xs text-text-primary outline-none focus:border-accent-blue cursor-pointer appearance-none ${className}`}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
