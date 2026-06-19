import React from "react";

export function Section({
  title,
  defaultOpen = true,
  children,
}: {
  title: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-3.5 border-t border-border/45 pt-3">
      <details open={defaultOpen} className="group">
        <summary className="mb-1 flex cursor-pointer list-none items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-accent">
          <span>{title}</span>
          <span className="ml-2 transition-transform group-open:rotate-90">›</span>
        </summary>
        {children}
      </details>
    </div>
  );
}

export function Stat({
  label,
  value,
  icon: Icon,
  iconClassName,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  iconClassName?: string;
}) {
  return (
    <div className="group rounded-lg border border-border/40 bg-secondary/35 px-1.5 py-2 transition-all duration-300 hover:border-accent/40 hover:bg-secondary/60 relative overflow-hidden flex flex-col justify-between min-h-[58px] hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/5">
      <div className="flex items-center justify-center gap-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground select-none">
        {Icon && (
          <Icon
            size={8}
            className={`shrink-0 transition-all duration-300 group-hover:scale-125 group-hover:rotate-12 ${iconClassName || "text-accent/85"}`}
          />
        )}
        <span>{label}</span>
      </div>
      <div className="font-heading text-lg font-extrabold text-foreground leading-tight drop-shadow-sm mt-1">
        {value}
      </div>
    </div>
  );
}
