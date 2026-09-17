import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";

export function RepositoryAnalysis() {
  return (
    <div>
      <PageHeader
        title="Repository Analysis"
        description="Git-history and source-code metrics extracted from your connected repositories."
      />
      <EmptyState
        title="Repository analysis will be available in a future phase."
        description="This section will surface commit history, churn, complexity metrics, and other code-quality signals once the code analyzer is implemented."
      />
    </div>
  );
}
