import { PageHeader } from "../components/PageHeader";

export function Settings() {
  return (
    <div>
      <PageHeader
        title="Settings"
        description="Application preferences and integration configuration."
      />

      <div className="space-y-4">
        <section className="rounded-lg border border-surface-border bg-surface-raised p-4">
          <h2 className="text-sm font-semibold text-slate-200">API Configuration</h2>
          <p className="mt-1 text-sm text-slate-400">
            The backend base URL is configured via the{" "}
            <code className="rounded bg-surface-border px-1.5 py-0.5 text-xs">
              VITE_API_BASE_URL
            </code>{" "}
            environment variable.
          </p>
        </section>

        <section className="rounded-lg border border-surface-border bg-surface-raised p-4">
          <h2 className="text-sm font-semibold text-slate-200">Integrations</h2>
          <p className="mt-1 text-sm text-slate-400">
            GitHub and CI/CD integrations will be configurable here in a future phase.
          </p>
        </section>
      </div>
    </div>
  );
}
