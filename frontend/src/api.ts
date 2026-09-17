import axios from "axios";

// In dev, Vite proxies /api -> http://localhost:8000 (see vite.config.ts)
export const api = axios.create({ baseURL: "/api" });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers ?? {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface Project {
  id: number;
  name: string;
  uploaded_at: string;
}

export interface Finding {
  id: number;
  type: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  file: string;
  line: number;
  description: string;
  recommendation: string;
  source: string;
}

export interface Dependency {
  id: number;
  name: string;
  version: string;
  pinned: string;
  risk: string;
  reason: string;
}

export interface FileRisk {
  file: string;
  risk: string;
  findings_count: number;
}

export interface AnalysisRun {
  id: number;
  project_id: number;
  status: string;
  created_at: string;
  loc: number;
  complexity: number;
  functions_count: number;
  classes_count: number;
  files_count: number;
  security_findings: number;
  critical_findings: number;
  high_findings: number;
  medium_findings: number;
  low_findings: number;
  hardcoded_secrets: number;
  dependencies_count: number;
  outdated_dependencies: number;
  risk_score: number;
  risk_category: string;
  ml_confidence: number;
  explanation: string;
}

export interface AnalysisDetail {
  run: AnalysisRun;
  findings: Finding[];
  dependencies: Dependency[];
  file_risks: FileRisk[];
}
