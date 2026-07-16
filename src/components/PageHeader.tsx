import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-8">
      <div>
        <h1 className="display text-3xl font-bold text-foreground">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

export function Kpi({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "positive" | "negative" | "warning";
}) {
  const toneClass = {
    default: "text-foreground",
    positive: "text-[color:var(--success)]",
    negative: "text-destructive",
    warning: "text-[color:var(--warning)]",
  }[tone];
  return (
    <div className="card-panel p-5">
      <div className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`display mt-2 text-2xl font-bold ${toneClass}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function Panel({
  title,
  children,
  right,
}: {
  title?: string;
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="card-panel p-5">
      {(title || right) && (
        <div className="flex items-center justify-between mb-4">
          {title && (
            <h3 className="display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {title}
            </h3>
          )}
          {right}
        </div>
      )}
      {children}
    </div>
  );
}
