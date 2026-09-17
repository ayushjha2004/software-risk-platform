import { useParams, Link } from "react-router-dom";

export default function Report() {
  const { projectId } = useParams();

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-6 text-center">
      <h1 className="text-2xl font-semibold">Report</h1>
      <p className="text-slate-400">
        Download the full software risk assessment report as a PDF, covering the overall score, security findings,
        code metrics, dependency analysis, and recommendations.
      </p>
      <a
        href={`/api/analysis/${projectId}/report${localStorage.getItem("token") ? `?token=${encodeURIComponent(localStorage.getItem("token") || "")}` : ""}`}
        className="inline-block bg-indigo-600 hover:bg-indigo-500 transition rounded-md px-6 py-3 font-medium"
      >
        Download PDF Report
      </a>
      <div>
        <Link to={`/projects/${projectId}/dashboard`} className="text-sm text-slate-500 hover:underline">
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
