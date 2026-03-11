interface PanelProps {
  title: string;
  color?: string;
  children: React.ReactNode;
  className?: string;
  onToggle?: () => void;
  enabled?: boolean;
}

export function Panel({
  title,
  color = "var(--accent-blue)",
  children,
  className = "",
  onToggle,
  enabled = true,
}: PanelProps) {
  const dotColor = enabled ? color : "var(--text-muted)";
  return (
    <div
      className={`bg-bg-panel rounded-lg border overflow-hidden transition-colors h-full flex flex-col ${
        enabled ? "border-border-default" : "border-border-default"
      } ${className}`}
    >
      <div className="flex items-center gap-2 px-2 py-1 border-b border-border-default shrink-0">
        <div
          className={`w-2 h-2 rounded-full transition-all ${onToggle ? "cursor-pointer hover:scale-125" : ""}`}
          style={{ background: dotColor, boxShadow: enabled && onToggle ? `0 0 4px ${color}` : "none" }}
          onClick={onToggle}
          title={onToggle ? (enabled ? "Click to disable" : "Click to enable") : undefined}
        />
        <span className="text-[9px] uppercase tracking-wider text-text-secondary font-medium select-none">
          {title}
        </span>
      </div>
      <div className={`p-2 flex-1 flex flex-col min-h-0 transition-opacity ${enabled ? "" : "opacity-30 pointer-events-none"}`}>
        {children}
      </div>
    </div>
  );
}
