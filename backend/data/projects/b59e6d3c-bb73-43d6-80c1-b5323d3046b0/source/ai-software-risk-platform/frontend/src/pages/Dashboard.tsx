import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { useHealthCheck } from "../hooks/useHealthCheck";

const SUMMARY_CARDS = [
  { label: "Projects Analyzed", value: "0" },
  { label: "Files at Risk", value: "0" },
  { label: "Open Pull Requests", value: "0" },
  { label: "Predictions Generated", value: "0" },
];

export function Dashboard() {
  const { status, health } = useHealthCheck();

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of your connected projects and defect-risk insights."
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SUMMARY_CARDS.map((card) => (
          <div
            key={card.label}
            className="rounded-lg border border-surface-border bg-surface-raised p-4"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {card.label}
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-100">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="mb-6 rounded-lg border border-surface-border bg-surface-raised p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Backend Connectivity
        </p>
        <p className="mt-2 text-sm text-slate-300">
          {status === "connected" && health
            ? `Connected to ${health.service} v${health.version} (${health.status}).`
            : status === "offline"
              ? "Unable to reach the backend API. Make sure it is running on the configured base URL."
              : "Checking backend connectivity..."}
        </p>
      </div>

      <EmptyState
        title="No projects analyzed yet."
        description="Connect a repository to start generating defect-risk insights. Repository analysis will be available in a future phase."
      />
    </div>
  );
}
