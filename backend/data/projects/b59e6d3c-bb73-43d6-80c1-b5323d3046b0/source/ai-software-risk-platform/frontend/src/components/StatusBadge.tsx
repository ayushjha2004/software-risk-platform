import type { BackendStatus } from "../types/api";

interface StatusBadgeProps {
  status: BackendStatus;
}

const STATUS_CONFIG: Record<BackendStatus, { label: string; dotClass: string }> = {
  checking: { label: "Checking...", dotClass: "bg-slate-400 animate-pulse" },
  connected: { label: "Connected", dotClass: "bg-risk-low" },
  offline: { label: "Offline", dotClass: "bg-risk-high" },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-surface-border bg-surface-raised px-3 py-1 text-xs font-medium text-slate-300">
      <span className={`h-2 w-2 rounded-full ${config.dotClass}`} />
      Backend Status: {config.label}
    </span>
  );
}
