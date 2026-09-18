"""Orchestrates source, dependency, OSV, metrics and risk analysis."""
import os
from dataclasses import dataclass
from typing import Dict, List
from . import code_analyzer, ast_analyzer, dependency_analyzer, metrics_analyzer, ml_model, explain
from .osv_client import OSVClient, VulnerabilityResult

TEXT_EXTENSIONS = code_analyzer.TEXT_EXTENSIONS | {".txt", ".json", ".yml", ".yaml", ".md", ".toml", ".xml", ".mod"}
MAX_FILE_BYTES = 1_500_000
SKIP_DIRS = {"node_modules", ".git", "venv", ".venv", "__pycache__", "dist", "build", ".idea", ".vscode"}


@dataclass
class PipelineResult:
    metrics: metrics_analyzer.RepoMetrics
    findings: List
    dependencies: List
    vulnerabilities: List[VulnerabilityResult]
    file_risks: List[dict]
    prediction: "ml_model.RiskPrediction"
    explanation: str
    critical: int
    high: int
    medium: int
    low: int
    hardcoded_secrets: int


def _read_repository_files(root_dir: str) -> Dict[str, str]:
    files = {}
    for dirpath, dirnames, filenames in os.walk(root_dir):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS and not d.startswith(".")]
        for fname in filenames:
            full_path = os.path.join(dirpath, fname)
            rel_path = os.path.relpath(full_path, root_dir).replace(os.sep, "/")
            if os.path.splitext(fname)[1].lower() not in TEXT_EXTENSIONS:
                continue
            try:
                if os.path.getsize(full_path) > MAX_FILE_BYTES:
                    continue
                with open(full_path, "r", encoding="utf-8", errors="ignore") as stream:
                    files[rel_path] = stream.read()
            except OSError:
                continue
    return files


def run_pipeline(root_dir: str, osv_client: OSVClient | None = None) -> PipelineResult:
    files = _read_repository_files(root_dir)
    all_findings = code_analyzer.scan_repository(files) + ast_analyzer.analyze_repository(files)
    dependencies = dependency_analyzer.analyze_repository(files)
    vulnerabilities = (osv_client or OSVClient()).query_packages(dependencies)

    # Live vulnerability results replace the former package-name heuristic.
    vulnerable_names = {v.package_name.lower() for v in vulnerabilities}
    for dependency in dependencies:
        if dependency.name.lower() in vulnerable_names:
            dependency.risk = "HIGH"
            dependency.reason = "OSV reported one or more vulnerabilities; review the fixed version."
        elif dependency.pinned == "no":
            dependency.risk = "UNKNOWN"
            dependency.reason = "Version is not exact; resolve a concrete version before vulnerability lookup."
        else:
            dependency.risk = "LOW"
            dependency.reason = "No vulnerability was returned by OSV for this package version."

    metrics = metrics_analyzer.analyze_repository(files)
    critical = sum(1 for finding in all_findings if finding.severity == "CRITICAL")
    high = sum(1 for finding in all_findings if finding.severity == "HIGH")
    medium = sum(1 for finding in all_findings if finding.severity == "MEDIUM")
    low = sum(1 for finding in all_findings if finding.severity == "LOW")
    hardcoded_secrets = sum(1 for finding in all_findings if "Credential" in finding.type or "AWS Key" in finding.type)
    prediction = ml_model.predict_risk(metrics.loc, metrics.complexity, len(all_findings) + len(vulnerabilities), critical, high, len(dependencies), sum(1 for d in dependencies if d.pinned == "no") + len(vulnerabilities), hardcoded_secrets)
    file_risks = explain.aggregate_file_risk(all_findings)
    explanation = explain.generate_explanation(prediction.category, critical, high, medium, low, metrics.complexity, sum(1 for d in dependencies if d.pinned == "no"), hardcoded_secrets)
    return PipelineResult(metrics, all_findings, dependencies, vulnerabilities, file_risks, prediction, explanation, critical, high, medium, low, hardcoded_secrets)
