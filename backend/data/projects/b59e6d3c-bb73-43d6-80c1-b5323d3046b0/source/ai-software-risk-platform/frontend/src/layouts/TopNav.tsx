import { useHealthCheck } from "../hooks/useHealthCheck";
import { StatusBadge } from "../components/StatusBadge";

export function TopNav() {
  const { status } = useHealthCheck();

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-surface-border bg-surface px-4 md:px-6">
      <div className="flex items-center gap-2 md:hidden">
        <div className="h-6 w-6 rounded bg-brand" />
        <span className="text-sm font-semibold text-slate-100">Risk Platform</span>
      </div>
      <div className="hidden text-sm text-slate-400 md:block">
        AI-Powered Software Defect Prediction &amp; Risk Analysis
      </div>
      <StatusBadge status={status} />
    </header>
  );
}
