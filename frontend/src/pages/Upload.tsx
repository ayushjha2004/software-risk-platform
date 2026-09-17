import { ChangeEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, Project } from "../api";

export default function Upload() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    api
      .get("/projects")
      .then((res) => setProjects(res.data))
      .catch(() => {});
  }, []);

  function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    setFile(e.target.files?.[0] ?? null);
  }

  async function startAnalysis(projectId: number) {
    setAnalyzing(true);
    setError("");
    try {
      await api.post(`/analysis/${projectId}/run`);
      navigate(`/projects/${projectId}/dashboard`);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await api.post("/projects/upload", form);
      await startAnalysis(res.data.id);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
      <div className="card">
        <h1 className="text-xl font-semibold mb-1">Upload Project</h1>
        <p className="text-slate-400 text-sm mb-6">
          Upload a .zip of a repository to run static, AST, dependency, and complexity analysis, then get an ML risk
          assessment.
        </p>

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        <div className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center">
          <input id="zip-input" type="file" accept=".zip" onChange={onFileChange} className="hidden" />
          <label htmlFor="zip-input" className="cursor-pointer text-indigo-400 hover:underline">
            {file ? file.name : "Select ZIP"}
          </label>
          <p className="text-slate-500 text-xs mt-2">Try sample-project.zip from the download for a quick demo.</p>
        </div>

        <button
          disabled={!file || uploading || analyzing}
          onClick={handleUpload}
          className="mt-6 w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 transition rounded-md py-2 font-medium"
        >
          {uploading ? "Uploading..." : analyzing ? "Analyzing..." : "Start Analysis"}
        </button>
      </div>

      {projects.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Your Projects</h2>
          <div className="space-y-2">
            {projects.map((p) => (
              <button
                key={p.id}
                onClick={() => navigate(`/projects/${p.id}/dashboard`)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-slate-800 hover:bg-slate-800/50 transition text-left"
              >
                <span>{p.name}</span>
                <span className="text-slate-500 text-xs">{new Date(p.uploaded_at).toLocaleString()}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
