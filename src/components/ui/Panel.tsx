interface PanelProps {
  title: string;
  color?: string;
  children: React.ReactNode;
  className?: string;
}

export function Panel({
  title,
  color = "var(--accent-blue)",
  children,
  className = "",
}: PanelProps) {
  return (
    <div
      className={`bg-bg-panel rounded-lg border border-border-default overflow-hidden ${className}`}
    >
      <div className="flex items-center gap-2 px-2 py-1 border-b border-border-default">
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
        <span className="text-[9px] uppercase tracking-wider text-text-secondary font-medium">
          {title}
        </span>
      </div>
      <div className="p-2">{children}</div>
    </div>
  );
}
