import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";

export function RiskAnalysis() {
  return (
    <div>
      <PageHeader
        title="Risk Analysis"
        description="Predicted defect risk scores for files and modules across your projects."
      />
      <EmptyState
        title="No risk analysis available."
        description="Risk scores will appear here once the machine-learning prediction engine is implemented in a later phase."
      />
    </div>
  );
}
