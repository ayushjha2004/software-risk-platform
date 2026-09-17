"""Module 7 — Convert raw analysis output into a numeric feature vector for the ML model.

Feature order (must match ml_model.py's training data generator):
[loc, complexity, security_findings, critical_findings, high_findings,
 dependencies_count, outdated_dependencies, hardcoded_secrets]
"""
from dataclasses import dataclass
from typing import List


@dataclass
class FeatureBundle:
    loc: int
    complexity: float
    security_findings: int
    critical_findings: int
    high_findings: int
    medium_findings: int
    low_findings: int
    dependencies_count: int
    outdated_dependencies: int
    hardcoded_secrets: int

    def to_vector(self) -> List[float]:
        return [
            float(self.loc),
            float(self.complexity),
            float(self.security_findings),
            float(self.critical_findings),
            float(self.high_findings),
            float(self.dependencies_count),
            float(self.outdated_dependencies),
            float(self.hardcoded_secrets),
        ]


FEATURE_NAMES = [
    "loc",
    "complexity",
    "security_findings",
    "critical_findings",
    "high_findings",
    "dependencies_count",
    "outdated_dependencies",
    "hardcoded_secrets",
]
