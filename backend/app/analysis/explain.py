"""Module 17 — File-level risk aggregation, and Module 18 — template-based explanation layer.

The spec explicitly suggests starting with template-based logic (no external
API needed) and optionally adding an LLM later — this implements the
template-based version.
"""
from collections import defaultdict
from typing import List, Dict

SEVERITY_WEIGHT = {"CRITICAL": 4, "HIGH": 3, "MEDIUM": 2, "LOW": 1}


def aggregate_file_risk(findings: List) -> List[dict]:
    """findings: list of RawFinding-like objects with .file and .severity"""
    per_file = defaultdict(lambda: {"score": 0, "count": 0})
    for f in findings:
        per_file[f.file]["score"] += SEVERITY_WEIGHT.get(f.severity, 1)
        per_file[f.file]["count"] += 1

    results = []
    for file, data in per_file.items():
        if data["score"] >= 8:
            risk = "HIGH"
        elif data["score"] >= 4:
            risk = "MEDIUM"
        else:
            risk = "LOW"
        results.append({"file": file, "risk": risk, "findings_count": data["count"]})

    results.sort(key=lambda r: {"HIGH": 0, "MEDIUM": 1, "LOW": 2}[r["risk"]])
    return results


def generate_explanation(category: str, critical: int, high: int, medium: int, low: int,
                          complexity: float, outdated_dependencies: int, hardcoded_secrets: int) -> str:
    reasons = []

    if critical > 0:
        reasons.append(f"{critical} critical-severity finding(s), including potential hardcoded credentials or unsafe code execution")
    if high > 0:
        reasons.append(f"{high} high-severity finding(s) such as potential injection or unsafe deserialization issues")
    if hardcoded_secrets > 0:
        reasons.append(f"{hardcoded_secrets} likely hardcoded secret(s) detected in source")
    if complexity > 15:
        reasons.append(f"relatively high average code complexity ({complexity})")
    if outdated_dependencies > 3:
        reasons.append(f"{outdated_dependencies} potentially outdated or unpinned dependencies")
    if medium > 5:
        reasons.append(f"a notable number of medium-severity findings ({medium})")

    if not reasons:
        if low > 0:
            reasons.append(f"only {low} low-severity finding(s) and no significant structural risk indicators")
        else:
            reasons.append("no significant security findings and low code/dependency risk indicators")

    reason_text = "; ".join(reasons)
    intro = {
        "HIGH": "The project received a HIGH risk assessment because",
        "MEDIUM": "The project received a MEDIUM risk assessment. Contributing factors:",
        "LOW": "The project received a LOW risk assessment. Summary:",
    }.get(category, "Risk assessment summary:")

    return f"{intro} {reason_text}. This is an automated first-level assessment and does not replace professional security testing."
