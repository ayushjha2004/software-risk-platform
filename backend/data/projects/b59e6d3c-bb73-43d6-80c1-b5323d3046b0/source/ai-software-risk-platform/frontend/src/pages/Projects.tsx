import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";

export function Projects() {
  return (
    <div>
      <PageHeader
        title="Projects"
        description="Manage the repositories and codebases you want to monitor for defect risk."
      />
      <EmptyState
        title="No projects analyzed yet."
        description="Once you add a project, it will appear here with its risk summary and analysis history."
      />
    </div>
  );
}
