import { FileRisk } from "../api";

export default function FileRiskTable({ fileRisks }: { fileRisks: FileRisk[] }) {
  return (
    <div className="card">
      <h2 className="text-lg font-semibold mb-4">File-Level Risk</h2>
      {fileRisks.length === 0 ? (
        <p className="text-slate-500 text-sm">No files with findings.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-800">
              <th className="pb-2 font-normal">File</th>
              <th className="pb-2 font-normal">Findings</th>
              <th className="pb-2 font-normal">Risk</th>
            </tr>
          </thead>
          <tbody>
            {fileRisks.map((fr) => (
              <tr key={fr.file} className="border-b border-slate-900">
                <td className="py-2 font-mono text-xs">{fr.file}</td>
                <td className="py-2">{fr.findings_count}</td>
                <td className="py-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full badge-${fr.risk}`}>{fr.risk}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
