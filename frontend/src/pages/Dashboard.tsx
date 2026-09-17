import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { api, AnalysisDetail } from "../api";
import RiskScoreCard from "../components/RiskScoreCard";

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: "#b91c1c",
  HIGH: "#ef4444",
  MEDIUM: "#f59e0b",
  LOW: "#22c55e",
};

export default function Dashboard() {
  const { projectId } = useParams();
  const [detail, setDetail] = useState<AnalysisDetail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get(`/analysis/${projectId}/latest`)
      .then((res) => setDetail(res.data))
      .catch((err) => setError(err?.response?.data?.detail ?? "Failed to load analysis"));
  }, [projectId]);

  if (error) {
    return <div className="max-w-4xl mx-auto px-4 py-10 text-red-400">{error}</div>;
  }
  if (!detail) {
    return <div className="max-w-4xl mx-auto px-4 py-10 text-slate-400">Loading dashboard…</div>;
  }

  const { run, file_risks, dependencies } = detail;

  const severityData = [
    { name: "Critical", value: run.critical_findings, color: SEVERITY_COLORS.CRITICAL },
    { name: "High", value: run.high_findings, color: SEVERITY_COLORS.HIGH },
    { name: "Medium", value: run.medium_findings, color: SEVERITY_COLORS.MEDIUM },
    { name: "Low", value: run.low_findings, color: SEVERITY_COLORS.LOW },
  ].filter((d) => d.value > 0);

  const componentBars = [
    { name: "Security", value: run.critical_findings * 3 + run.high_findings * 2 + run.medium_findings },
    { name: "Complexity", value: run.complexity },
    { name: "Dependencies", value: run.outdated_dependencies },
    { name: "Secrets", value: run.hardcoded_secrets },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Risk Dashboard</h1>
        <div className="flex gap-3">
          <Link
            to={`/projects/${projectId}/findings`}
            className="text-sm px-3 py-2 rounded-md border border-slate-700 hover:bg-slate-800 transition"
          >
            View Findings
          </Link>
          <Link
            to={`/projects/${projectId}/files`}
            className="text-sm px-3 py-2 rounded-md border border-slate-700 hover:bg-slate-800 transition"
          >
            File Risk
          </Link>
          <a
            href={`/api/analysis/${projectId}/report${localStorage.getItem("token") ? `?token=${encodeURIComponent(localStorage.getItem("token") || "")}` : ""}`}
            className="text-sm px-3 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 transition"
          >
            Download PDF Report
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <RiskScoreCard score={run.risk_score} category={run.risk_category} confidence={run.ml_confidence} />

        <div className="card md:col-span-2">
          <h2 className="text-lg font-semibold mb-4">Findings by Severity</h2>
          {severityData.length === 0 ? (
            <p className="text-slate-500 text-sm">No findings detected.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={severityData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
                  {severityData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b" }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Files" value={run.files_count} />
        <StatCard label="LOC" value={run.loc} />
        <StatCard label="Functions" value={run.functions_count} />
        <StatCard label="Dependencies" value={run.dependencies_count} />
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Risk Component Breakdown</h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={componentBars}>
            <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
            <YAxis stroke="#64748b" fontSize={12} />
            <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b" }} />
            <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold mb-2">AI Explanation</h2>
        <p className="text-slate-300 text-sm leading-relaxed">{run.explanation}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FileRiskCard file_risks={file_risks} />
        <DependencyCard dependencies={dependencies} />
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="card text-center">
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-slate-500 text-xs uppercase tracking-wide mt-1">{label}</p>
    </div>
  );
}

function FileRiskCard({ file_risks }: { file_risks: AnalysisDetail["file_risks"] }) {
  return (
    <div className="card">
      <h2 className="text-lg font-semibold mb-4">File Risk</h2>
      {file_risks.length === 0 ? (
        <p className="text-slate-500 text-sm">No risky files found.</p>
      ) : (
        <div className="space-y-2">
          {file_risks.slice(0, 8).map((fr) => (
            <div key={fr.file} className="flex items-center justify-between text-sm">
              <span className="font-mono text-xs text-slate-300">{fr.file}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full badge-${fr.risk}`}>{fr.risk}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DependencyCard({ dependencies }: { dependencies: AnalysisDetail["dependencies"] }) {
  return (
    <div className="card">
      <h2 className="text-lg font-semibold mb-4">Dependency Analysis</h2>
      {dependencies.length === 0 ? (
        <p className="text-slate-500 text-sm">No manifest files (requirements.txt / package.json) found.</p>
      ) : (
        <div className="space-y-2">
          {dependencies.map((d) => (
            <div key={d.id} className="flex items-center justify-between text-sm">
              <span>
                {d.name} <span className="text-slate-500">({d.version})</span>
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full badge-${d.risk}`}>{d.risk}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
