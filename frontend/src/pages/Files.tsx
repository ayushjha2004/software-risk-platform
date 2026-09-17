import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api, AnalysisDetail } from "../api";
import FileRiskTable from "../components/FileRiskTable";

export default function Files() {
  const { projectId } = useParams();
  const [detail, setDetail] = useState<AnalysisDetail | null>(null);
  const [error, setError] = useState("");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  useEffect(() => {
    api
      .get(`/analysis/${projectId}/latest`)
      .then((res) => setDetail(res.data))
      .catch((err) => setError(err?.response?.data?.detail ?? "Failed to load file risk"));
  }, [projectId]);

  if (error) {
    return <div className="max-w-4xl mx-auto px-4 py-10 text-red-400">{error}</div>;
  }
  if (!detail) {
    return <div className="max-w-4xl mx-auto px-4 py-10 text-slate-400">Loading file risk…</div>;
  }

  const findingsForFile = selectedFile ? detail.findings.filter((f) => f.file === selectedFile) : [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">File-Level Risk</h1>
        <Link
          to={`/projects/${projectId}/dashboard`}
          className="text-sm px-3 py-2 rounded-md border border-slate-700 hover:bg-slate-800 transition"
        >
          Back to Dashboard
        </Link>
      </div>

      <div className="card">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-800">
              <th className="pb-2 font-normal">File</th>
              <th className="pb-2 font-normal">Findings</th>
              <th className="pb-2 font-normal">Risk</th>
            </tr>
          </thead>
          <tbody>
            {detail.file_risks.map((fr) => (
              <tr
                key={fr.file}
                onClick={() => setSelectedFile(fr.file === selectedFile ? null : fr.file)}
                className="border-b border-slate-900 cursor-pointer hover:bg-slate-800/40"
              >
                <td className="py-2 font-mono text-xs">{fr.file}</td>
                <td className="py-2">{fr.findings_count}</td>
                <td className="py-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full badge-${fr.risk}`}>{fr.risk}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedFile && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">
            Findings in <span className="font-mono text-sm">{selectedFile}</span>
          </h2>
          <div className="space-y-2">
            {findingsForFile.map((f) => (
              <div key={f.id} className="border border-slate-800 rounded-lg px-4 py-3 text-sm">
                <div className="flex items-center gap-3 mb-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full badge-${f.severity}`}>{f.severity}</span>
                  <span className="font-medium">{f.type}</span>
                  <span className="text-slate-500">line {f.line}</span>
                </div>
                <p className="text-slate-400">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
