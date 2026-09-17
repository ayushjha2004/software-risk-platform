import { useState } from "react";
import { Finding } from "../api";

const SEVERITY_ORDER = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

export default function FindingsTable({ findings }: { findings: Finding[] }) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [filter, setFilter] = useState<string>("ALL");

  const sorted = [...findings].sort(
    (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)
  );
  const visible = filter === "ALL" ? sorted : sorted.filter((f) => f.severity === filter);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Finding Explorer</h2>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-md text-sm px-2 py-1"
        >
          <option value="ALL">All severities</option>
          {SEVERITY_ORDER.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {visible.length === 0 && <p className="text-slate-500 text-sm">No findings in this category.</p>}

      <div className="space-y-2">
        {visible.map((f) => (
          <div key={f.id} className="border border-slate-800 rounded-lg overflow-hidden">
            <button
              onClick={() => setExpanded(expanded === f.id ? null : f.id)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-800/50 transition text-left"
            >
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2 py-0.5 rounded-full badge-${f.severity}`}>{f.severity}</span>
                <span className="font-medium">{f.type}</span>
                <span className="text-slate-500 text-sm">
                  {f.file}:{f.line}
                </span>
              </div>
              <span className="text-slate-500 text-xs">{f.source === "ast" ? "AST-verified" : "pattern match"}</span>
            </button>
            {expanded === f.id && (
              <div className="px-4 pb-4 pt-1 text-sm space-y-2 bg-slate-950/40">
                <p>
                  <span className="text-slate-400">Description: </span>
                  {f.description}
                </p>
                <p>
                  <span className="text-slate-400">Recommendation: </span>
                  {f.recommendation}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
