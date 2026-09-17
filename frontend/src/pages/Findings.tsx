import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api, AnalysisDetail } from "../api";
import FindingsTable from "../components/FindingsTable";

export default function Findings() {
  const { projectId } = useParams();
  const [detail, setDetail] = useState<AnalysisDetail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get(`/analysis/${projectId}/latest`)
      .then((res) => setDetail(res.data))
      .catch((err) => setError(err?.response?.data?.detail ?? "Failed to load findings"));
  }, [projectId]);

  if (error) {
    return <div className="max-w-4xl mx-auto px-4 py-10 text-red-400">{error}</div>;
  }
  if (!detail) {
    return <div className="max-w-4xl mx-auto px-4 py-10 text-slate-400">Loading findings…</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Findings</h1>
        <Link
          to={`/projects/${projectId}/dashboard`}
          className="text-sm px-3 py-2 rounded-md border border-slate-700 hover:bg-slate-800 transition"
        >
          Back to Dashboard
        </Link>
      </div>
      <FindingsTable findings={detail.findings} />
    </div>
  );
}
