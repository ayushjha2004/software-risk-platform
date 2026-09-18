import axios from "axios";
import { api, AnalysisDetail } from "../api";

export interface Vulnerability {
  id: number;
  vulnerability_id: string;
  aliases: string[];
  package_name: string;
  installed_version: string;
  ecosystem: string;
  severity: string;
  cvss: number | null;
  summary: string;
  affected_versions: string[];
  fixed_version: string | null;
  references: string[];
}

// In dev, Vite proxies /api -> http://localhost:8000.
const baseURL = import.meta.env.VITE_API_URL || "/api";
export { api };
export const http = axios.create({ baseURL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("email");
      localStorage.removeItem("role");
      if (typeof window !== "undefined" && !["/login", "/register"].includes(window.location.pathname)) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export interface Project { id: number; name: string; uploaded_at: string; }
export interface Finding { id: number; type: string; severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"; file: string; line: number; description: string; recommendation: string; source: string; }
export interface Dependency { id: number; name: string; version: string; pinned: string; risk: string; reason: string; ecosystem: string; manifest: string; direct: boolean; }
export interface FileRisk { file: string; risk: string; findings_count: number; }
export interface AnalysisRun { id: number; project_id: number; status: string; created_at: string; loc: number; complexity: number; functions_count: number; classes_count: number; files_count: number; security_findings: number; critical_findings: number; high_findings: number; medium_findings: number; low_findings: number; hardcoded_secrets: number; dependencies_count: number; outdated_dependencies: number; risk_score: number; risk_category: string; ml_confidence: number; explanation: string; }
export interface AnalysisDetail { run: AnalysisRun; findings: Finding[]; dependencies: Dependency[]; vulnerabilities: Vulnerability[]; file_risks: FileRisk[]; }
