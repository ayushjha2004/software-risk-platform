"""Orchestrates the full analysis pipeline:
Repository Parser -> Code/AST/Dependency/Metrics Analysis -> Feature Extraction
-> ML Risk Prediction -> Risk Assessment (persisted by the caller).
"""
import os
from dataclasses import dataclass
from typing import Dict, List

from . import code_analyzer, ast_analyzer, dependency_analyzer, metrics_analyzer, ml_model, explain
from .feature_extractor import FeatureBundle

TEXT_EXTENSIONS = code_analyzer.TEXT_EXTENSIONS | {".txt", ".json", ".yml", ".yaml", ".md"}
MAX_FILE_BYTES = 1_500_000
SKIP_DIRS = {"node_modules", ".git", "venv", ".venv", "__pycache__", "dist", "build", ".idea", ".vscode"}


@dataclass
class PipelineResult:
    metrics: metrics_analyzer.RepoMetrics
    findings: List
    dependencies: List
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
            ext = os.path.splitext(fname)[1].lower()
            if ext not in TEXT_EXTENSIONS:
                continue
            try:
                if os.path.getsize(full_path) > MAX_FILE_BYTES:
                    continue
                with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
                    files[rel_path] = f.read()
            except OSError:
                continue
    return files


def run_pipeline(root_dir: str) -> PipelineResult:
    files = _read_repository_files(root_dir)

    regex_findings = code_analyzer.scan_repository(files)
    ast_findings = ast_analyzer.analyze_repository(files)
    all_findings = regex_findings + ast_findings

    dependencies = dependency_analyzer.analyze_repository(files)
    metrics = metrics_analyzer.analyze_repository(files)

    critical = sum(1 for f in all_findings if f.severity == "CRITICAL")
    high = sum(1 for f in all_findings if f.severity == "HIGH")
    medium = sum(1 for f in all_findings if f.severity == "MEDIUM")
    low = sum(1 for f in all_findings if f.severity == "LOW")
    hardcoded_secrets = sum(1 for f in all_findings if "Credential" in f.type or "AWS Key" in f.type)

    dependencies_count = len(dependencies)
    outdated_dependencies = sum(1 for d in dependencies if d.pinned == "no")

    prediction = ml_model.predict_risk(
        loc=metrics.loc,
        complexity=metrics.complexity,
        security_findings=len(all_findings),
        critical_findings=critical,
        high_findings=high,
        dependencies_count=dependencies_count,
        outdated_dependencies=outdated_dependencies,
        hardcoded_secrets=hardcoded_secrets,
    )

    file_risks = explain.aggregate_file_risk(all_findings)

    explanation = explain.generate_explanation(
        category=prediction.category,
        critical=critical,
        high=high,
        medium=medium,
        low=low,
        complexity=metrics.complexity,
        outdated_dependencies=outdated_dependencies,
        hardcoded_secrets=hardcoded_secrets,
    )

    return PipelineResult(
        metrics=metrics,
        findings=all_findings,
        dependencies=dependencies,
        file_risks=file_risks,
        prediction=prediction,
        explanation=explanation,
        critical=critical,
        high=high,
        medium=medium,
        low=low,
        hardcoded_secrets=hardcoded_secrets,
    )
